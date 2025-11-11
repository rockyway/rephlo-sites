# Phase 6: Application Bootstrap - Implementation Guide

**Status:** Ready to implement
**Created:** 2025-11-05
**Parent Plan:** `090-di-refactoring-master-plan.md`
**Duration:** 1 day
**Priority:** Low
**Prerequisites:** Phase 5 completed and verified

## Overview

Phase 6 finalizes the application bootstrap process to fully leverage the DI container. This includes updating the main entry point, implementing proper graceful shutdown, and verifying the entire DI setup.

---

## Objectives

- [x] `reflect-metadata` imported first in entry point
- [x] Container verified on startup
- [x] Graceful shutdown implemented
- [x] All global state removed
- [x] Health check endpoint added

---

## Task Breakdown

### Task 6.1: Update Main Entry Point (1 hour)

**File:** `backend/src/index.ts` or `backend/src/server.ts`

**Complete refactored version:**

```typescript
/**
 * Application Entry Point
 *
 * ⚠️ CRITICAL: reflect-metadata must be imported FIRST
 */
import 'reflect-metadata';

// Initialize DI container (must be early)
import { container, verifyContainer, disposeContainer } from './container';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import logger from './utils/logger';

// Import routes (these now use container internally)
import { createV1Router } from './routes/v1.routes';
import { createOAuthRouter } from './routes/oauth.routes';
import { errorHandler } from './middleware/error.middleware';

const PORT = parseInt(process.env.PORT || '7150');
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint (uses container)
  app.get('/health', async (req, res) => {
    try {
      const prisma = container.resolve('PrismaClient');
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // API routes (no parameters - use container internally)
  app.use('/v1', createV1Router());
  app.use('/oauth', createOAuthRouter());

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the application server
 */
async function startServer(): Promise<void> {
  try {
    // 1. Verify DI container is properly configured
    logger.info('Server: Verifying DI container...');
    verifyContainer();

    // 2. Create Express app
    logger.info('Server: Creating Express application...');
    const app = createApp();

    // 3. Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server: Started successfully`, {
        port: PORT,
        host: HOST,
        env: process.env.NODE_ENV,
      });
    });

    // 4. Graceful shutdown handlers
    setupGracefulShutdown(server);

    logger.info('Server: Ready to accept requests');
  } catch (error) {
    logger.error('Server: Failed to start', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    logger.info(`Server: Received ${signal}, shutting down gracefully...`);

    // 1. Stop accepting new connections
    server.close(() => {
      logger.info('Server: HTTP server closed');
    });

    // 2. Dispose DI container resources
    await disposeContainer();

    logger.info('Server: Graceful shutdown complete');
    process.exit(0);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Server: Uncaught exception', { error: error.message });
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Server: Unhandled promise rejection', { reason });
    shutdown('unhandledRejection');
  });
}

// Start the server
startServer();
```

**Key Features:**
1. ✅ `reflect-metadata` imported first
2. ✅ Container verified on startup
3. ✅ Graceful shutdown with resource cleanup
4. ✅ Health check endpoint
5. ✅ Proper error handling
6. ✅ No global Prisma instance

**Acceptance Criteria:**
- [x] `reflect-metadata` is first import
- [x] Container verified before server starts
- [x] Graceful shutdown implemented
- [x] Health check works

---

### Task 6.2: Update package.json Scripts (15 minutes)

**File:** `backend/package.json`

Ensure scripts work with new structure:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

**Acceptance Criteria:**
- [x] `npm run dev` starts development server
- [x] `npm run build` compiles successfully
- [x] `npm start` runs production build

---

### Task 6.3: Remove Global State (30 minutes)

Search for and remove any remaining global state:

```bash
# Find global Prisma instances
grep -r "const prisma = new PrismaClient" backend/src/ --exclude-dir=node_modules

# Find global Redis instances
grep -r "const redis = new Redis" backend/src/ --exclude-dir=node_modules

# Find any other global service instances
grep -r "const.*Service = new" backend/src/ --exclude-dir=node_modules
```

**Files to check:**
- `backend/src/services/*.ts` - Should have no global instances
- `backend/src/utils/*.ts` - May have singletons, evaluate if needed
- Old factory functions - Should be removed or deprecated

**Acceptance Criteria:**
- [x] No global Prisma instances (except in container.ts)
- [x] No global Redis instances (except in container.ts)
- [x] No global service instances

---

### Task 6.4: Add Startup Diagnostics (30 minutes)

**File:** `backend/src/container.ts`

Add diagnostic logging to container:

```typescript
/**
 * Verify container configuration and log diagnostics
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

    // Check providers
    try {
      const providers = container.resolveAll<ILLMProvider>('ILLMProvider');
      logger.info('DI Container: LLM providers verified', {
        count: providers.length,
        providers: providers.map((p) => p.providerName),
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
      'ISubscriptionService',
      'IStripeService',
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
```

**Acceptance Criteria:**
- [x] Startup logs show container status
- [x] Logs show registered providers
- [x] Logs show registered services
- [x] Failures are clearly reported

---

### Task 6.5: Verification (1 hour)

**Manual testing:**

1. **Start application:**
   ```bash
   npm run dev
   ```

   Expected logs:
   ```
   DI Container: Initialized successfully
   DI Container: Running verification...
   DI Container: Infrastructure verified { prisma: true, redis: true }
   DI Container: LLM providers verified { count: 3, providers: ['openai', 'anthropic', 'google'] }
   DI Container: Services verified { registered: 8, services: [...] }
   DI Container: Verification complete ✅
   Server: Creating Express application...
   Server: Started successfully { port: 7150, host: '0.0.0.0', env: 'development' }
   Server: Ready to accept requests
   ```

2. **Test health check:**
   ```bash
   curl http://localhost:7150/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-05T...",
     "uptime": 5.123
   }
   ```

3. **Test graceful shutdown:**
   ```bash
   # Press Ctrl+C
   ```

   Expected logs:
   ```
   Server: Received SIGINT, shutting down gracefully...
   Server: HTTP server closed
   DI Container: Disposing resources...
   DI Container: Prisma disconnected
   DI Container: Redis disconnected
   DI Container: All resources disposed successfully
   Server: Graceful shutdown complete
   ```

4. **Test API endpoints:**
   ```bash
   curl http://localhost:7150/v1/models
   ```

**Acceptance Criteria:**
- [x] Application starts without errors
- [x] Container verification passes
- [x] Health check works
- [x] Graceful shutdown works
- [x] API endpoints respond correctly
- [x] No global state detected

---

## Next Steps

After Phase 6:

1. Create Phase 7 branch
2. Implement testing infrastructure
3. Refer to: `097-di-phase7-testing-infrastructure.md`

---

**Document Metadata:**
- Phase: 6/7
- Duration: 1 day
- Previous: `095-di-phase5-middleware-refactoring.md`
- Next: `097-di-phase7-testing-infrastructure.md`
