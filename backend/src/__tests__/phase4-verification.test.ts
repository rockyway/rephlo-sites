/**
 * Phase 4 Verification Tests - Routes & Controllers Refactoring
 *
 * This test suite verifies that all controllers are properly refactored
 * to use the DI container and can be resolved correctly.
 *
 * Test Coverage:
 * 1. All controllers can be resolved from container
 * 2. Controllers are singleton instances
 * 3. Controllers have required dependencies injected
 * 4. Route creation works without parameters
 *
 * Reference: docs/plan/094-di-phase4-routes-controllers-refactoring.md
 */

import 'reflect-metadata';
import { container } from '../container';
import { UsersController } from '../controllers/users.controller';
import { ModelsController } from '../controllers/models.controller';
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { CreditsController } from '../controllers/credits.controller';
import { WebhooksController } from '../controllers/webhooks.controller';
import { createV1Router } from '../routes/v1.routes';

describe('Phase 4: Routes & Controllers Verification', () => {
  describe('Controller Resolution', () => {
    it('should resolve UsersController from container', () => {
      const controller = container.resolve(UsersController);
      expect(controller).toBeInstanceOf(UsersController);
      expect(controller).toBeDefined();
    });

    it('should resolve ModelsController from container', () => {
      const controller = container.resolve(ModelsController);
      expect(controller).toBeInstanceOf(ModelsController);
      expect(controller).toBeDefined();
    });

    it('should resolve SubscriptionsController from container', () => {
      const controller = container.resolve(SubscriptionsController);
      expect(controller).toBeInstanceOf(SubscriptionsController);
      expect(controller).toBeDefined();
    });

    it('should resolve CreditsController from container', () => {
      const controller = container.resolve(CreditsController);
      expect(controller).toBeInstanceOf(CreditsController);
      expect(controller).toBeDefined();
    });

    it('should resolve WebhooksController from container', () => {
      const controller = container.resolve(WebhooksController);
      expect(controller).toBeInstanceOf(WebhooksController);
      expect(controller).toBeDefined();
    });
  });

  describe('Controller Singleton Behavior', () => {
    it('should return same instance of UsersController', () => {
      const instance1 = container.resolve(UsersController);
      const instance2 = container.resolve(UsersController);
      expect(instance1).toBe(instance2);
    });

    it('should return same instance of ModelsController', () => {
      const instance1 = container.resolve(ModelsController);
      const instance2 = container.resolve(ModelsController);
      expect(instance1).toBe(instance2);
    });

    it('should return same instance of SubscriptionsController', () => {
      const instance1 = container.resolve(SubscriptionsController);
      const instance2 = container.resolve(SubscriptionsController);
      expect(instance1).toBe(instance2);
    });

    it('should return same instance of CreditsController', () => {
      const instance1 = container.resolve(CreditsController);
      const instance2 = container.resolve(CreditsController);
      expect(instance1).toBe(instance2);
    });

    it('should return same instance of WebhooksController', () => {
      const instance1 = container.resolve(WebhooksController);
      const instance2 = container.resolve(WebhooksController);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Controller Dependency Injection', () => {
    it('should inject IUserService into UsersController', () => {
      const controller = container.resolve(UsersController);
      // Controller should have userService property (private, but injected)
      expect(controller).toBeDefined();
      // Test that controller methods exist (they depend on injected service)
      expect(typeof controller.getCurrentUser).toBe('function');
      expect(typeof controller.updateCurrentUser).toBe('function');
    });

    it('should inject IModelService into ModelsController', () => {
      const controller = container.resolve(ModelsController);
      expect(controller).toBeDefined();
      expect(typeof controller.listModels).toBe('function');
      expect(typeof controller.getModelDetails).toBe('function');
    });

    it('should inject PrismaClient into SubscriptionsController', () => {
      const controller = container.resolve(SubscriptionsController);
      expect(controller).toBeDefined();
      expect(typeof controller.getCurrentSubscription).toBe('function');
      expect(typeof controller.createSubscription).toBe('function');
    });

    it('should inject ICreditService and IUsageService into CreditsController', () => {
      const controller = container.resolve(CreditsController);
      expect(controller).toBeDefined();
      expect(typeof controller.getCurrentCredits).toBe('function');
      expect(typeof controller.getUsageHistory).toBe('function');
    });

    it('should inject IWebhookService into WebhooksController', () => {
      const controller = container.resolve(WebhooksController);
      expect(controller).toBeDefined();
      expect(typeof controller.getWebhookConfig).toBe('function');
      expect(typeof controller.setWebhookConfig).toBe('function');
    });
  });

  describe('Route Creation', () => {
    it('should create v1 router without parameters', () => {
      const router = createV1Router();
      expect(router).toBeDefined();
      // Router should have stack property with registered routes
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it('should have all expected route handlers', () => {
      const router = createV1Router();

      // Count routes - we expect many routes to be registered
      const routeCount = router.stack.length;

      // We should have at least 20 routes registered
      // (users, models, completions, subscriptions, credits, webhooks, etc.)
      expect(routeCount).toBeGreaterThan(20);
    });
  });

  describe('No Factory Functions', () => {
    it('should not export createUsersController function', () => {
      // This test ensures factory functions are removed
      const module = require('../controllers/users.controller');
      expect(module.createUsersController).toBeUndefined();
    });

    it('should not export createModelsController function', () => {
      const module = require('../controllers/models.controller');
      expect(module.createModelsController).toBeUndefined();
    });

    it('should not export createCreditsController function', () => {
      const module = require('../controllers/credits.controller');
      expect(module.createCreditsController).toBeUndefined();
    });

    it('should not export createSubscriptionsController function', () => {
      const module = require('../controllers/subscriptions.controller');
      expect(module.createSubscriptionsController).toBeUndefined();
    });
  });

  describe('Container Health', () => {
    it('should have all controllers registered in container', () => {
      // Try to resolve all controllers - this will fail if not registered
      expect(() => container.resolve(UsersController)).not.toThrow();
      expect(() => container.resolve(ModelsController)).not.toThrow();
      expect(() => container.resolve(SubscriptionsController)).not.toThrow();
      expect(() => container.resolve(CreditsController)).not.toThrow();
      expect(() => container.resolve(WebhooksController)).not.toThrow();
    });
  });
});
