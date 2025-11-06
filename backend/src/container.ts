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

/**
 * Register Redis Connection (singleton)
 * Used for caching, sessions, and BullMQ queues
 */
container.register('RedisConnection', {
  useValue: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
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
// Service Registration
// ============================================================================

// Services will be registered in Phase 2 and 3
// Example (to be uncommented when services are refactored):
// import { AuthService } from './services/auth.service';
// container.register('IAuthService', { useClass: AuthService });

// ============================================================================
// Provider Registration
// ============================================================================

// Providers will be registered in Phase 2
// Example (to be uncommented when providers are created):
// import { OpenAIProvider } from './providers/openai.provider';
// container.register('ILLMProvider', { useClass: OpenAIProvider });

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
