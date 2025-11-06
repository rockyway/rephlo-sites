/**
 * Credit Deduction Middleware
 *
 * Pre-flight check for credit availability before inference requests.
 * Ensures users have sufficient credits before processing LLM requests.
 *
 * Usage:
 *   app.post('/v1/completions', authMiddleware, checkCredits(), handler);
 *
 * Integration:
 * - Used by model inference endpoints
 * - Checks credit availability before calling LLM providers
 * - Returns 403 error if insufficient credits
 * - Calculates estimated credits based on model and max_tokens
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md
 */

import { Request, Response, NextFunction } from 'express';
import { CreditService } from '../services/credit.service';
import logger from '../utils/logger';
import { forbiddenError } from './error.middleware';
import { container } from '../container';

/**
 * Credit check middleware
 * Validates user has sufficient credits before inference
 *
 * This middleware:
 * 1. Gets user's current credit balance
 * 2. Estimates credits required for the request
 * 3. Checks if user has sufficient credits
 * 4. Returns 403 error if insufficient credits
 * 5. Attaches credit info to request for downstream handlers
 *
 * @returns Express middleware function
 */
export function checkCredits() {
  const creditService = container.resolve<CreditService>('ICreditService');

  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        logger.error('checkCredits: No user ID in request');
        throw forbiddenError('Authentication required');
      }

      logger.debug('checkCredits: Checking credit availability', { userId });

      // Get user's current credits
      const credit = await creditService.getCurrentCredits(userId);

      if (!credit) {
        logger.warn('checkCredits: No active credits found', { userId });
        throw forbiddenError(
          'No active subscription. Please subscribe to use the API.'
        );
      }

      const remainingCredits = creditService.calculateRemainingCredits(credit);

      // Estimate credits required for this request
      const estimatedCredits = estimateCreditsRequired(req);

      logger.debug('checkCredits: Credit check', {
        userId,
        remainingCredits,
        estimatedCredits,
      });

      // Check if user has sufficient credits
      if (remainingCredits < estimatedCredits) {
        logger.warn('checkCredits: Insufficient credits', {
          userId,
          remainingCredits,
          estimatedCredits,
        });

        throw forbiddenError('Insufficient credits', {
          required_credits: estimatedCredits,
          available_credits: remainingCredits,
          message:
            'You do not have enough credits to complete this request. Please upgrade your subscription or wait for the next billing period.',
        });
      }

      // Attach credit info to request for downstream handlers
      // This allows the model service to access credit info without additional queries
      (req as any).creditInfo = {
        creditId: credit.id,
        remainingCredits,
        estimatedCredits,
      };

      logger.debug('checkCredits: Credit check passed', {
        userId,
        remainingCredits,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Estimate credits required for an inference request
 * Based on model and max_tokens parameters
 *
 * Note: This is a conservative estimate to prevent credit exhaustion
 * Actual credits will be calculated and deducted after inference completes
 *
 * @param req - Express request object
 * @returns Estimated credits required
 */
function estimateCreditsRequired(req: Request): number {
  const body = req.body;

  // Default estimation (if model/tokens not specified)
  let estimatedCredits = 5;

  // Get model from request body
  const modelId = body.model;

  // Get max_tokens from request body
  const maxTokens = body.max_tokens || 4096;

  // Estimate input tokens (rough approximation)
  // For chat completions: sum of message lengths / 4 (average chars per token)
  // For text completions: prompt length / 4
  let estimatedInputTokens = 100; // Default

  if (body.messages && Array.isArray(body.messages)) {
    // Chat completion
    const totalChars = body.messages.reduce(
      (sum: number, msg: any) =>
        sum + (msg.content ? msg.content.length : 0),
      0
    );
    estimatedInputTokens = Math.ceil(totalChars / 4);
  } else if (body.prompt && typeof body.prompt === 'string') {
    // Text completion
    estimatedInputTokens = Math.ceil(body.prompt.length / 4);
  }

  // Total estimated tokens (input + max output)
  const estimatedTotalTokens = estimatedInputTokens + maxTokens;

  // Estimate credits based on model
  // Default: 2 credits per 1k tokens (GPT-5, Claude-like pricing)
  // Gemini: 1 credit per 1k tokens
  let creditsPerKTokens = 2;

  if (modelId) {
    if (modelId.includes('gemini')) {
      creditsPerKTokens = 1;
    } else if (modelId.includes('gpt') || modelId.includes('claude')) {
      creditsPerKTokens = 2;
    }
  }

  // Calculate estimated credits (round up to be conservative)
  estimatedCredits = Math.ceil(
    (estimatedTotalTokens / 1000) * creditsPerKTokens
  );

  // Minimum 1 credit
  estimatedCredits = Math.max(1, estimatedCredits);

  logger.debug('Credit estimation', {
    modelId,
    estimatedInputTokens,
    maxTokens,
    estimatedTotalTokens,
    creditsPerKTokens,
    estimatedCredits,
  });

  return estimatedCredits;
}

/**
 * Optional credit check middleware
 * Logs credit status but doesn't block request if insufficient
 * Useful for non-critical endpoints or testing
 *
 * @returns Express middleware function
 */
export function optionalCreditCheck() {
  const creditService = container.resolve<CreditService>('ICreditService');

  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        next();
        return;
      }

      const credit = await creditService.getCurrentCredits(userId);

      if (credit) {
        const remainingCredits =
          creditService.calculateRemainingCredits(credit);
        const estimatedCredits = estimateCreditsRequired(req);

        logger.info('optionalCreditCheck: Credit status', {
          userId,
          remainingCredits,
          estimatedCredits,
          hasEnough: remainingCredits >= estimatedCredits,
        });

        // Attach credit info even if insufficient (for logging/analytics)
        (req as any).creditInfo = {
          creditId: credit.id,
          remainingCredits,
          estimatedCredits,
        };
      }

      next();
    } catch (error) {
      logger.error('optionalCreditCheck: Error checking credits', {
        error: (error as Error).message,
      });
      // Don't block request on error
      next();
    }
  };
}

/**
 * Check if user has credits (any amount)
 * Simpler check that only validates user has an active subscription
 *
 * @returns Express middleware function
 */
export function requireActiveSubscription() {
  const creditService = container.resolve<CreditService>('ICreditService');

  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        logger.error('requireActiveSubscription: No user ID in request');
        throw forbiddenError('Authentication required');
      }

      const credit = await creditService.getCurrentCredits(userId);

      if (!credit) {
        logger.warn('requireActiveSubscription: No active subscription', {
          userId,
        });
        throw forbiddenError(
          'No active subscription. Please subscribe to access this resource.'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extend Express Request type to include credit info
 */
declare global {
  namespace Express {
    interface Request {
      creditInfo?: {
        creditId: string;
        remainingCredits: number;
        estimatedCredits: number;
      };
    }
  }
}
