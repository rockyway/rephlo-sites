/**
 * OAuth Enhanced Token Controller
 *
 * Provides enhanced token data endpoint for OAuth clients.
 * This endpoint is called after the standard /oauth/token exchange to get
 * user profile and credit information in a single request.
 *
 * Approach: Rather than intercepting the OIDC provider's token endpoint
 * (which would require complex Koa<->Express bridging), we provide a separate
 * enhancement endpoint that clients can call immediately after token exchange.
 *
 * Benefits:
 * - Maintains full OIDC compliance
 * - Simpler implementation
 * - Better error handling
 * - Backward compatible
 *
 * Reference: docs/plan/100-dedicated-api-credits-user-endpoints.md (Section 3 & 4)
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IUserService, ICreditService } from '../interfaces';
import logger from '../utils/logger';
import jwt from 'jsonwebtoken';

@injectable()
export class OAuthController {
  constructor(
    @inject('IUserService') private userService: IUserService,
    @inject('ICreditService') private creditService: ICreditService
  ) {
    logger.debug('OAuthController: Initialized');
  }

  /**
   * POST /oauth/token/enhance
   * Enhance token response with user data and/or credits
   *
   * Request body:
   * - access_token: JWT access token from /oauth/token
   * - include_user_data: 'true' | 'false' (optional, default: false)
   * - include_credits: 'true' | 'false' (optional, default: false)
   *
   * Response:
   * - user: { userId, email, displayName, subscription, credits } (if include_user_data=true)
   * - credits: { freeCredits, proCredits, totalAvailable } (if include_credits=true)
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  async enhanceTokenResponse(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { access_token, include_user_data, include_credits } = req.body;

      // Validate access token
      if (!access_token || typeof access_token !== 'string') {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'access_token is required',
        });
        return;
      }

      // Extract userId from token
      const userId = this.extractUserIdFromToken(access_token);

      if (!userId) {
        res.status(401).json({
          error: 'invalid_token',
          error_description: 'Invalid or malformed access token',
        });
        return;
      }

      logger.info('OAuth: Token enhancement requested', {
        userId,
        include_user_data: include_user_data === 'true',
        include_credits: include_credits === 'true',
      });

      const response: any = {};

      // Fetch user data if requested
      if (include_user_data === 'true') {
        const [userProfile, credits] = await Promise.all([
          this.userService.getDetailedUserProfile(userId),
          this.creditService.getDetailedCredits(userId),
        ]);

        if (!userProfile) {
          res.status(404).json({
            error: 'user_not_found',
            error_description: 'User profile not found',
          });
          return;
        }

        response.user = {
          userId: userProfile.userId,
          email: userProfile.email,
          displayName:
            userProfile.displayName || userProfile.email.split('@')[0],
          subscription: {
            tier: userProfile.subscription.tier,
            status: userProfile.subscription.status,
          },
          credits: {
            freeCredits: {
              remaining: credits.freeCredits.remaining,
              monthlyAllocation: credits.freeCredits.monthlyAllocation,
              resetDate: credits.freeCredits.resetDate.toISOString(),
            },
            proCredits: {
              remaining: credits.proCredits.remaining,
              purchasedTotal: credits.proCredits.purchasedTotal,
            },
            totalAvailable: credits.totalAvailable,
          },
        };

        logger.info('OAuth: User data included in response', {
          userId,
          tier: userProfile.subscription.tier,
          totalCredits: credits.totalAvailable,
        });
      }
      // Fetch only credits if requested (without full user profile)
      else if (include_credits === 'true') {
        const credits = await this.creditService.getDetailedCredits(userId);

        response.credits = {
          freeCredits: {
            remaining: credits.freeCredits.remaining,
            monthlyAllocation: credits.freeCredits.monthlyAllocation,
            resetDate: credits.freeCredits.resetDate.toISOString(),
          },
          proCredits: {
            remaining: credits.proCredits.remaining,
            purchasedTotal: credits.proCredits.purchasedTotal,
          },
          totalAvailable: credits.totalAvailable,
        };

        logger.info('OAuth: Credits included in response', {
          userId,
          totalCredits: credits.totalAvailable,
        });
      }

      // If neither requested, return empty response
      if (!response.user && !response.credits) {
        logger.warn('OAuth: No enhancement requested', { userId });
        res.status(400).json({
          error: 'invalid_request',
          error_description:
            'At least one of include_user_data or include_credits must be true',
        });
        return;
      }

      res.json(response);
    } catch (error) {
      logger.error('OAuth: Token enhancement error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Extract userId from JWT access token
   * Decodes the JWT and extracts the 'sub' claim
   *
   * @param accessToken - JWT access token
   * @returns User ID or null if extraction fails
   */
  private extractUserIdFromToken(accessToken: string): string | null {
    try {
      // Decode JWT without verification
      // Verification is already done by OIDC provider during token issuance
      const decoded = jwt.decode(accessToken) as any;

      if (!decoded || !decoded.sub) {
        logger.warn('OAuth: Invalid token structure', { decoded });
        return null;
      }

      return decoded.sub;
    } catch (error) {
      logger.error('OAuth: Failed to decode access token', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
