/**
 * Dependency Injection Container Configuration
 *
 * This file sets up the TSyringe container and registers all services,
 * providers, and infrastructure dependencies.
 *
 * Usage:
 *   import { container } from './container';
 *   const service = container.resolve<IAuthService>('IAuthService');
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();


// ============================================================================
// Infrastructure Registration (Singletons)
// ============================================================================

/**
 * Register Prisma Client (singleton)
 * Shared across all services for database access
 */
container.register('PrismaClient', {
  useValue: new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  }),
});


console.log('process.env.REDIS_URL', process.env.REDIS_URL);
console.log('process.env.REDIS_PASSWORD', process.env.REDIS_PASSWORD);


/**
 * Register Redis Connection (singleton)
 * Used for caching, sessions, and BullMQ queues
 */
container.register('RedisConnection', {
  useValue: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 10, 2000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  }),
});

// ============================================================================
// LLM SDK Clients (Singletons)
// ============================================================================

/**
 * Register OpenAI Client
 */
if (process.env.OPENAI_API_KEY) {
  container.register('OpenAIClient', {
    useValue: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });
  logger.info('DI Container: OpenAI client registered');
} else {
  logger.warn('DI Container: OPENAI_API_KEY not set, OpenAI provider will not be available');
}

/**
 * Register Anthropic Client
 */
if (process.env.ANTHROPIC_API_KEY) {
  container.register('AnthropicClient', {
    useValue: new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
  });
  logger.info('DI Container: Anthropic client registered');
} else {
  logger.warn('DI Container: ANTHROPIC_API_KEY not set, Anthropic provider will not be available');
}

/**
 * Register Google AI Client
 */
if (process.env.GOOGLE_API_KEY) {
  container.register('GoogleClient', {
    useValue: new GoogleGenerativeAI(process.env.GOOGLE_API_KEY),
  });
  logger.info('DI Container: Google AI client registered');
} else {
  logger.warn('DI Container: GOOGLE_API_KEY not set, Google provider will not be available');
}

// ============================================================================
// Azure OpenAI Client (Conditional Registration)
// ============================================================================

/**
 * Register Azure OpenAI Client (conditional on environment variables)
 * Required env vars:
 * - AZURE_OPENAI_ENDPOINT
 * - AZURE_OPENAI_API_KEY
 * - AZURE_OPENAI_DEPLOYMENT_NAME
 * - AZURE_OPENAI_API_VERSION
 */
if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  const azureOpenAI = new OpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
    defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
  });

  container.register('AzureOpenAIClient', { useValue: azureOpenAI });
  logger.info('DI Container: Azure OpenAI client registered');
} else {
  logger.warn('DI Container: AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT not set, Azure OpenAI client not registered');
}

// ============================================================================
// LLM Provider Registration
// ============================================================================

import { OpenAIProvider } from './providers/openai.provider';
import { AzureOpenAIProvider } from './providers/azure-openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';

// Register all providers (multi-registration for Strategy Pattern)
container.register('ILLMProvider', { useClass: OpenAIProvider });

// Only register Azure OpenAI provider if client is available
if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  container.register('ILLMProvider', { useClass: AzureOpenAIProvider });
}

container.register('ILLMProvider', { useClass: AnthropicProvider });
container.register('ILLMProvider', { useClass: GoogleProvider });

const registeredProviders = ['openai', 'anthropic', 'google'];
if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  registeredProviders.push('azure-openai');
}

logger.info('DI Container: LLM providers registered', {
  providers: registeredProviders,
});

// ============================================================================
// Service Registration
// ============================================================================

import { UsageService } from './services/usage.service';
import { CreditService } from './services/credit.service';
import { UsageRecorder } from './services/llm/usage-recorder';
import { LLMService } from './services/llm.service';

// Temporary: Register concrete classes for UsageService and CreditService
// Will be replaced with interface-based registration in Phase 3
container.register('IUsageService', { useClass: UsageService });
container.register('ICreditService', { useClass: CreditService });

// Register LLM-related services
container.registerSingleton(UsageRecorder);
container.registerSingleton(LLMService);

logger.info('DI Container: LLM services registered');

// ============================================================================
// Container Health Check
// ============================================================================

/**
 * Verify container is properly configured
 * Logs registered services for debugging
 */
export function verifyContainer(): void {
  try {
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    const redis = container.resolve<Redis>('RedisConnection');

    logger.info('DI Container: Verified infrastructure dependencies', {
      prisma: !!prisma,
      redis: !!redis,
    });
  } catch (error) {
    logger.error('DI Container: Verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Clean up container resources on shutdown
 */
export async function disposeContainer(): Promise<void> {
  try {
    logger.info('DI Container: Disposing resources...');

    const prisma = container.resolve<PrismaClient>('PrismaClient');
    await prisma.$disconnect();
    logger.info('DI Container: Prisma disconnected');

    const redis = container.resolve<Redis>('RedisConnection');
    await redis.quit();
    logger.info('DI Container: Redis disconnected');

    logger.info('DI Container: All resources disposed successfully');
  } catch (error) {
    logger.error('DI Container: Error during disposal', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Export Container
// ============================================================================

export { container };

// Log container initialization
logger.info('DI Container: Initialized successfully');
