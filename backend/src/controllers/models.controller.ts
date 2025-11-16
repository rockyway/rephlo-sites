/**
 * Models Controller
 *
 * Handles HTTP endpoints for model management and LLM inference.
 * All endpoints require authentication (JWT bearer token).
 *
 * Endpoints:
 * - GET    /v1/models                    - List available models (scope: models.read)
 * - GET    /v1/models/:modelId           - Get model details (scope: models.read)
 * - POST   /v1/completions               - Text completion (scope: llm.inference)
 * - POST   /v1/chat/completions          - Chat completion (scope: llm.inference)
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Model APIs)
 */

import { injectable, inject } from 'tsyringe';
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { IModelService } from '../interfaces';
import { LLMService } from '../services/llm.service';
import {
  listModelsQuerySchema,
  textCompletionSchema,
  chatCompletionSchema,
  TextCompletionRequest,
  ChatCompletionRequest,
} from '../types/model-validation';
import {
  notFoundError,
  validationError,
  unauthorizedError,
  createApiError,
} from '../middleware/error.middleware';
import { getUserId, getUserTier } from '../middleware/auth.middleware';
import { subscription_tier } from '@prisma/client';

// =============================================================================
// Models Controller Class
// =============================================================================

@injectable()
export class ModelsController {
  constructor(
    @inject('IModelService') private modelService: IModelService,
    @inject(LLMService) private llmService: LLMService
  ) {
    logger.debug('ModelsController: Initialized');
  }

  // ===========================================================================
  // Model Listing Endpoints
  // ===========================================================================

  /**
   * GET /v1/models
   * List available models with optional filters
   *
   * Requires: Authentication (JWT token)
   * Scope: models.read
   *
   * Query parameters:
   * - available: boolean - Filter by availability
   * - capability: string - Comma-separated list of capabilities
   * - provider: string - Filter by provider (openai, anthropic, google)
   */
  async listModels(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    logger.debug('ModelsController.listModels', {
      query: req.query,
      userId,
    });

    // Validate query parameters
    const parseResult = listModelsQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Query validation failed', errors);
    }

    const filters = parseResult.data;

    try {
      // Get user tier if authenticated
      let userTier: subscription_tier | undefined;
      if (userId) {
        userTier = (await getUserTier(userId)) as subscription_tier;
        logger.debug('ModelsController.listModels: User tier retrieved', {
          userId,
          userTier,
        });
      }

      const result = await this.modelService.listModels(
        {
          available: filters.available,
          capability: filters.capability,
          provider: filters.provider,
        },
        userTier
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error('ModelsController.listModels: Error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * GET /v1/models/:modelId
   * Get detailed information about a specific model
   *
   * Requires: Authentication (JWT token)
   * Scope: models.read
   */
  async getModelDetails(req: Request, res: Response): Promise<void> {
    const { modelId } = req.params;
    const userId = getUserId(req);

    logger.debug('ModelsController.getModelDetails', { modelId, userId });

    if (!modelId) {
      throw validationError('Model ID is required');
    }

    try {
      // Get user tier if authenticated
      let userTier: subscription_tier | undefined;
      if (userId) {
        userTier = (await getUserTier(userId)) as subscription_tier;
        logger.debug('ModelsController.getModelDetails: User tier retrieved', {
          userId,
          userTier,
        });
      }

      const model = await this.modelService.getModelDetails(modelId, userTier);
      res.status(200).json(model);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw notFoundError(`Model '${modelId}'`);
      }
      logger.error('ModelsController.getModelDetails: Error', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ===========================================================================
  // Text Completion Endpoint
  // ===========================================================================

  /**
   * POST /v1/completions
   * Execute text completion request
   *
   * Requires: Authentication (JWT token)
   * Scope: llm.inference
   *
   * Body: {
   *   model: string,
   *   prompt: string,
   *   max_tokens?: number,
   *   temperature?: number,
   *   stream?: boolean,
   *   ... other parameters
   * }
   */
  async textCompletion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('ModelsController.textCompletion: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('ModelsController.textCompletion', {
      userId,
      body: { ...req.body, prompt: req.body.prompt?.substring(0, 50) + '...' },
    });

    // Validate request body
    const parseResult = textCompletionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Request validation failed', errors);
    }

    const request: TextCompletionRequest = parseResult.data;

    try {
      // Get user tier for access control
      const userTier = (await getUserTier(userId)) as subscription_tier;

      logger.debug('ModelsController.textCompletion: User tier retrieved', {
        userId,
        userTier,
      });

      // Get model information
      const modelInfo = await this.modelService.getModelForInference(
        request.model
      );

      if (!modelInfo) {
        throw notFoundError(`Model '${request.model}' not found or unavailable`);
      }

      // NEW: Tier access validation
      const accessCheck = await this.modelService.canUserAccessModel(
        request.model,
        userTier
      );

      if (!accessCheck.allowed) {
        logger.warn('ModelsController.textCompletion: Model access denied', {
          userId,
          modelId: request.model,
          userTier,
          reason: accessCheck.reason,
        });

        throw createApiError(
          `Model access restricted: ${accessCheck.reason}`,
          403,
          'model_access_restricted',
          {
            model_id: request.model,
            user_tier: userTier,
            required_tier: accessCheck.requiredTier,
            upgrade_url: '/subscriptions/upgrade',
          }
        );
      }

      // Credit balance check is handled by checkCredits middleware
      // req.creditInfo contains: { creditId, remainingCredits, estimatedCredits }

      // Execute completion request
      if (request.stream) {
        // Streaming response
        await this.llmService.streamTextCompletion(
          request,
          modelInfo.provider,
          userId,
          res
        );
      } else {
        // Non-streaming response
        const result = await this.llmService.textCompletion(
          request,
          modelInfo.provider,
          userId
        );

        res.status(200).json(result);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('not found') ||
          error.message.includes('unavailable'))
      ) {
        throw notFoundError(`Model '${request.model}'`);
      }

      if (
        error instanceof Error &&
        (error.message.includes('not initialized') ||
          error.message.includes('API key'))
      ) {
        throw createApiError(
          `Model provider not configured: ${error.message}`,
          503,
          'service_unavailable'
        );
      }

      logger.error('ModelsController.textCompletion: Error', {
        userId,
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ===========================================================================
  // Chat Completion Endpoint
  // ===========================================================================

  /**
   * POST /v1/chat/completions
   * Execute chat completion request
   *
   * Requires: Authentication (JWT token)
   * Scope: llm.inference
   *
   * Body: {
   *   model: string,
   *   messages: Array<{ role: string, content: string }>,
   *   max_tokens?: number,
   *   temperature?: number,
   *   stream?: boolean,
   *   ... other parameters
   * }
   */
  async chatCompletion(req: Request, res: Response): Promise<void> {
    const userId = getUserId(req);

    if (!userId) {
      logger.error('ModelsController.chatCompletion: No user ID in request');
      throw unauthorizedError('Authentication required');
    }

    logger.debug('ModelsController.chatCompletion', {
      userId,
      body: {
        ...req.body,
        messages: req.body.messages?.length + ' messages',
      },
    });

    // Validate request body
    const parseResult = chatCompletionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      throw validationError('Request validation failed', errors);
    }

    const request: ChatCompletionRequest = parseResult.data;

    try {
      // Get user tier for access control
      const userTier = (await getUserTier(userId)) as subscription_tier;

      logger.debug('ModelsController.chatCompletion: User tier retrieved', {
        userId,
        userTier,
      });

      // Get model information
      const modelInfo = await this.modelService.getModelForInference(
        request.model
      );

      if (!modelInfo) {
        throw notFoundError(`Model '${request.model}' not found or unavailable`);
      }

      // NEW: Tier access validation
      const accessCheck = await this.modelService.canUserAccessModel(
        request.model,
        userTier
      );

      if (!accessCheck.allowed) {
        logger.warn('ModelsController.chatCompletion: Model access denied', {
          userId,
          modelId: request.model,
          userTier,
          reason: accessCheck.reason,
        });

        throw createApiError(
          `Model access restricted: ${accessCheck.reason}`,
          403,
          'model_access_restricted',
          {
            model_id: request.model,
            user_tier: userTier,
            required_tier: accessCheck.requiredTier,
            upgrade_url: '/subscriptions/upgrade',
          }
        );
      }

      // Credit balance check is handled by checkCredits middleware
      // req.creditInfo contains: { creditId, remainingCredits, estimatedCredits }

      // Execute completion request
      if (request.stream) {
        // Streaming response
        await this.llmService.streamChatCompletion(
          request,
          modelInfo.provider,
          userId,
          res
        );
      } else {
        // Non-streaming response
        const result = await this.llmService.chatCompletion(
          request,
          modelInfo.provider,
          userId
        );

        res.status(200).json(result);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('not found') ||
          error.message.includes('unavailable'))
      ) {
        throw notFoundError(`Model '${request.model}'`);
      }

      if (
        error instanceof Error &&
        (error.message.includes('not initialized') ||
          error.message.includes('API key'))
      ) {
        throw createApiError(
          `Model provider not configured: ${error.message}`,
          503,
          'service_unavailable'
        );
      }

      logger.error('ModelsController.chatCompletion: Error', {
        userId,
        model: request.model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
