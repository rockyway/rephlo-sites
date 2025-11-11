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

// Register providers conditionally based on available clients
// This prevents DI errors when API keys are not set
const registeredProviders: string[] = [];

// Register OpenAI provider only if client is available
if (process.env.OPENAI_API_KEY) {
  container.register('ILLMProvider', { useClass: OpenAIProvider });
  registeredProviders.push('openai');
}

// Register Azure OpenAI provider only if client is available
if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  container.register('ILLMProvider', { useClass: AzureOpenAIProvider });
  registeredProviders.push('azure-openai');
}

// Register Anthropic provider only if client is available
if (process.env.ANTHROPIC_API_KEY) {
  container.register('ILLMProvider', { useClass: AnthropicProvider });
  registeredProviders.push('anthropic');
}

// Register Google provider only if client is available
if (process.env.GOOGLE_API_KEY) {
  container.register('ILLMProvider', { useClass: GoogleProvider });
  registeredProviders.push('google');
}

if (registeredProviders.length === 0) {
  logger.warn('DI Container: No LLM providers registered. Set at least one API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or AZURE_OPENAI_API_KEY)');
} else {
  logger.info('DI Container: LLM providers registered', {
    providers: registeredProviders,
  });
}

// ============================================================================
// Service Registration (Phase 3: All Core Services)
// ============================================================================

import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { CreditService } from './services/credit.service';
import { UsageService } from './services/usage.service';
import { ModelService } from './services/model.service';
import { WebhookService } from './services/webhook.service';
import { UsageRecorder } from './services/llm/usage-recorder';
import { LLMService } from './services/llm.service';
import { IEmailService } from './services/email/email.service.interface';
import { SendGridEmailService } from './services/email/sendgrid-email.service';

// Plan 112: Token-to-Credit Conversion Services
import { CostCalculationService } from './services/cost-calculation.service';
import { PricingConfigService } from './services/pricing-config.service';
import { TokenTrackingService } from './services/token-tracking.service';
import { CreditDeductionService } from './services/credit-deduction.service';

// Plan 109: Subscription Monetization Services
import { SubscriptionManagementService } from './services/subscription-management.service';
import { UserManagementService } from './services/user-management.service';
import { BillingPaymentsService } from './services/billing-payments.service';
import { CreditManagementService } from './services/credit-management.service';
import { PlatformAnalyticsService } from './services/platform-analytics.service';

// Phase 4 P0 Fixes: Audit Logging
import { AuditLogService } from './services/audit-log.service';

// Phase 4 Backend: Admin Analytics & User Detail
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminUserDetailService } from './services/admin-user-detail.service';
import { RevenueAnalyticsService } from './services/revenue-analytics.service';

// Phase 1 Performance Optimizations: Role Caching (Plan 126/127)
import { RoleCacheService } from './services/role-cache.service';

// Phase 3 Permission Caching Layer: Permission Caching (Plan 126/127)
import { PermissionCacheService } from './services/permission-cache.service';
// Phase 5 Admin Session Management: Session Tracking (Plan 126/127)
import { SessionManagementService } from './services/session-management.service';

// Plan 131 Phase 2: Settings Management
import { SettingsService } from './services/settings.service';

// Plan 131 Phase 6: Admin Profitability Service
import { AdminProfitabilityService } from './services/admin-profitability.service';

// Register core services with interface tokens
container.register('IAuthService', { useClass: AuthService });
container.register('IUserService', { useClass: UserService });
container.register('ICreditService', { useClass: CreditService });
container.register('IUsageService', { useClass: UsageService });
container.register('IModelService', { useClass: ModelService });
container.register('IWebhookService', { useClass: WebhookService });

// Register Email Service (Phase 4)
container.register<IEmailService>('IEmailService', { useClass: SendGridEmailService });

// Register Plan 112 services
container.register('ICostCalculationService', { useClass: CostCalculationService });
container.register('IPricingConfigService', { useClass: PricingConfigService });
container.register('ITokenTrackingService', { useClass: TokenTrackingService });
container.register('ICreditDeductionService', { useClass: CreditDeductionService });

// Register Plan 109 services
container.register('SubscriptionManagementService', { useClass: SubscriptionManagementService });
container.register('UserManagementService', { useClass: UserManagementService });
container.register('BillingPaymentsService', { useClass: BillingPaymentsService });
container.register('CreditManagementService', { useClass: CreditManagementService });
container.register('PlatformAnalyticsService', { useClass: PlatformAnalyticsService });

// Register Audit Logging service (Phase 4 P0 Fixes)
container.registerSingleton(AuditLogService);

// Register Admin Analytics & User Detail services (Phase 4 Backend)
container.registerSingleton(AdminAnalyticsService);
container.registerSingleton(AdminUserDetailService);
container.registerSingleton(RevenueAnalyticsService);

// Register Role Cache service (Phase 1 Performance Optimizations)
container.registerSingleton(RoleCacheService);

// Register Permission Cache service (Phase 3 Permission Caching Layer)
container.registerSingleton(PermissionCacheService);
// Register Session Management service (Phase 5 Admin Session Management)
container.registerSingleton(SessionManagementService);

// Register Settings service (Plan 131 Phase 2)
container.registerSingleton(SettingsService);

// Register Admin Profitability service (Plan 131 Phase 6)
container.register('AdminProfitabilityService', { useClass: AdminProfitabilityService });

// Register LLM-related services
container.registerSingleton(UsageRecorder);
container.registerSingleton(LLMService);

logger.info('DI Container: Core services registered', {
  services: [
    'AuthService',
    'UserService',
    'CreditService',
    'UsageService',
    'ModelService',
    'WebhookService',
    'EmailService',
    'LLMService',
    'UsageRecorder',
    'CostCalculationService',
    'PricingConfigService',
    'TokenTrackingService',
    'CreditDeductionService',
    'SubscriptionManagementService',
    'UserManagementService',
    'BillingPaymentsService',
    'CreditManagementService',
    'PlatformAnalyticsService',
  ],
});

// ============================================================================
// Controller Registration (Phase 4: Routes & Controllers)
// ============================================================================

import { UsersController } from './controllers/users.controller';
import { ModelsController } from './controllers/models.controller';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { CreditsController } from './controllers/credits.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { AdminController } from './controllers/admin.controller';
import { BrandingController } from './controllers/branding.controller';
import { AuthManagementController } from './controllers/auth-management.controller';
import { SocialAuthController } from './controllers/social-auth.controller';

// Plan 109: Subscription Monetization Controllers
import { SubscriptionManagementController } from './controllers/subscription-management.controller';
import { UserManagementController } from './controllers/user-management.controller';
import { BillingController } from './controllers/billing.controller';
import { CreditManagementController } from './controllers/credit-management.controller';
import { AnalyticsController } from './controllers/analytics.controller';

// Phase 4 P0 Fixes: Audit Log Controller
import { AuditLogController } from './controllers/audit-log.controller';

// Phase 4 Backend: Admin Analytics & User Detail Controllers
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminUserDetailController } from './controllers/admin-user-detail.controller';
import { RevenueAnalyticsController } from './controllers/revenue-analytics.controller';

// Plan 131 Phase 2: Settings Controller
import { SettingsController } from './controllers/admin/settings.controller';

// Plan 131 Phase 6: Profitability Controller
import { ProfitabilityController } from './controllers/admin/profitability.controller';

// Register controllers as singletons for consistent instances
container.registerSingleton(UsersController);
container.registerSingleton(ModelsController);
container.registerSingleton(SubscriptionsController);
container.registerSingleton(CreditsController);
container.registerSingleton(WebhooksController);
container.registerSingleton(AdminController);
container.registerSingleton(BrandingController);
container.registerSingleton(AuthManagementController);
container.registerSingleton(SocialAuthController);

// Register Plan 109 controllers
container.registerSingleton(SubscriptionManagementController);
container.registerSingleton(UserManagementController);
container.registerSingleton(BillingController);
container.registerSingleton(CreditManagementController);
container.registerSingleton(AnalyticsController);

// Register Audit Log controller (Phase 4 P0 Fixes)
container.registerSingleton(AuditLogController);

// Register Admin Analytics & User Detail controllers (Phase 4 Backend)
container.registerSingleton(AdminAnalyticsController);
container.registerSingleton(AdminUserDetailController);
container.registerSingleton(RevenueAnalyticsController);

// Register Settings controller (Plan 131 Phase 2)
container.registerSingleton(SettingsController);

// Register Profitability controller (Plan 131 Phase 6)
container.registerSingleton(ProfitabilityController);

logger.info('DI Container: Controllers registered', {
  controllers: [
    'UsersController',
    'ModelsController',
    'SubscriptionsController',
    'CreditsController',
    'WebhooksController',
    'AdminController',
    'BrandingController',
    'AuthManagementController',
    'SocialAuthController',
    'SubscriptionManagementController',
    'UserManagementController',
    'BillingController',
    'CreditManagementController',
    'AnalyticsController',
  ],
});

// ============================================================================
// Container Health Check
// ============================================================================

/**
 * Verify container is properly configured
 * Logs registered services for debugging
 */
export function verifyContainer(): void {
  try {
    logger.info('DI Container: Running verification...');

    // Check infrastructure
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    const redis = container.resolve<Redis>('RedisConnection');

    logger.info('DI Container: Infrastructure verified', {
      prisma: !!prisma,
      redis: !!redis,
    });

    // Check LLM providers
    try {
      const providers = container.resolveAll('ILLMProvider');
      const providerNames = providers.map((p: any) => p.providerName || 'unknown');
      logger.info('DI Container: LLM providers verified', {
        count: providers.length,
        providers: providerNames,
      });
    } catch (error) {
      logger.warn('DI Container: LLM providers not registered (expected in Phase 2+)');
    }

    // Check services
    const servicesToCheck = [
      'IAuthService',
      'IUserService',
      'ICreditService',
      'IUsageService',
      'IModelService',
      'IWebhookService',
    ];

    const registeredServices: string[] = [];
    servicesToCheck.forEach((service) => {
      try {
        container.resolve(service);
        registeredServices.push(service);
      } catch (error) {
        logger.warn(`DI Container: Service ${service} not registered`);
      }
    });

    logger.info('DI Container: Services verified', {
      registered: registeredServices.length,
      services: registeredServices,
    });

    logger.info('DI Container: Verification complete ✅');
  } catch (error) {
    logger.error('DI Container: Verification failed ❌', {
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
  logger.info('DI Container: Disposing resources...');

  try {
    // Disconnect Prisma
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    await prisma.$disconnect();
    logger.info('DI Container: Prisma disconnected');
  } catch (error) {
    logger.error('DI Container: Error disconnecting Prisma', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    // Disconnect Redis
    const redis = container.resolve<Redis>('RedisConnection');
    await redis.quit();
    logger.info('DI Container: Redis disconnected');
  } catch (error) {
    logger.error('DI Container: Error disconnecting Redis', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info('DI Container: All resources disposed successfully');
}

// ============================================================================
// Export Container
// ============================================================================

export { container };

// Log container initialization
logger.info('DI Container: Initialized successfully');
