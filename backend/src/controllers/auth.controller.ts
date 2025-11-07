/**
 * Auth Controller
 *
 * Handles OIDC interaction endpoints:
 * - Login interaction
 * - Consent interaction
 * - Interaction abort
 *
 * These endpoints are called by the OIDC provider during the authorization flow.
 */

import { Request, Response, NextFunction } from 'express';
import type Provider from 'oidc-provider';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { getInteractionDetails, finishInteraction } from '../config/oidc';
import logger from '../utils/logger';
import path from 'path';

export class AuthController {
  private provider: Provider;
  private authService: AuthService;

  constructor(provider: Provider, prisma: PrismaClient) {
    this.provider = provider;
    this.authService = new AuthService(prisma);
  }

  /**
   * GET /interaction/:uid
   * Entry point for OIDC interaction
   * Determines if login or consent is needed
   */
  interaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const details = await getInteractionDetails(
        this.provider,
        req,
        res
      );

      const { uid, prompt, params } = details;

      logger.info('OIDC Interaction started', {
        uid,
        prompt: prompt.name,
        clientId: params.client_id,
      });

      // Route to appropriate interaction
      if (prompt.name === 'login') {
        // Render login page with no-cache headers to prevent browser caching
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.sendFile(
          path.join(__dirname, '../views/login.html')
        );
      } else if (prompt.name === 'consent') {
        // Render consent page with no-cache headers
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.sendFile(
          path.join(__dirname, '../views/consent.html')
        );
      } else {
        // Unknown prompt
        logger.warn('Unknown OIDC prompt', {
          uid,
          prompt: prompt.name,
        });
        res.status(400).json({
          error: 'invalid_request',
          message: `Unknown prompt: ${prompt.name}`,
        });
      }
    } catch (error) {
      logger.error('OIDC Interaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  /**
   * POST /interaction/:uid/login
   * Process login form submission
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Email and password are required',
        });
        return;
      }

      // Authenticate user
      const user = await this.authService.authenticate(email, password);

      if (!user) {
        res.status(401).json({
          error: 'invalid_credentials',
          message: 'Invalid email or password',
        });
        return;
      }

      // Complete login interaction
      const result = {
        login: {
          accountId: user.id,
          remember: true, // Remember the session
        },
      };

      await finishInteraction(this.provider, req, res, result);

      logger.info('OIDC: login interaction success', { userId: user.id });
    } catch (error) {
      logger.error('OIDC Login interaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  /**
   * POST /interaction/:uid/consent
   * Process consent form submission
   */
  consent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const details = await getInteractionDetails(
        this.provider,
        req,
        res
      );

      const {
        prompt: { name, details: promptDetails },
        params,
        session,
      } = details;

      if (name !== 'consent') {
        res.status(400).json({
          error: 'invalid_request',
          message: 'Expected consent prompt',
        });
        return;
      }

      // Get granted scopes from form
      const grantedScopes = req.body.scopes
        ? Array.isArray(req.body.scopes)
          ? req.body.scopes
          : [req.body.scopes]
        : [];

      // Validate scopes
      const requestedScopes = (params.scope as string)?.split(' ') || [];
      const invalidScopes = grantedScopes.filter(
        (scope: string) => !requestedScopes.includes(scope)
      );

      if (invalidScopes.length > 0) {
        res.status(400).json({
          error: 'invalid_scope',
          message: `Invalid scopes: ${invalidScopes.join(', ')}`,
        });
        return;
      }

      // Complete consent interaction
      const grant = details.grantId
        ? await this.provider.Grant.find(details.grantId)
        : new this.provider.Grant({
            accountId: session?.accountId,
            clientId: params.client_id as string,
          });

      if (grant) {
        // Add granted scopes to grant
        grant.addOIDCScope(grantedScopes.join(' '));

        // Add granted resources (if any)
        if (promptDetails?.missingResourceScopes) {
          for (const [indicator, scopes] of Object.entries(
            promptDetails.missingResourceScopes
          )) {
            grant.addResourceScope(indicator, (scopes as string[]).join(' '));
          }
        }

        // Save grant
        const grantId = await grant.save();

        // Complete consent interaction
        const result = {
          consent: {
            grantId,
          },
        };

        await finishInteraction(this.provider, req, res, result);

        logger.info('OIDC Consent granted', {
          userId: session?.accountId,
          clientId: params.client_id,
          scopes: grantedScopes,
        });
      } else {
        throw new Error('Failed to create grant');
      }
    } catch (error) {
      logger.error('OIDC Consent interaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  /**
   * GET /interaction/:uid/abort
   * Abort the interaction (user cancels)
   */
  abort = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const details = await getInteractionDetails(
        this.provider,
        req,
        res
      );

      const result = {
        error: 'access_denied',
        error_description: 'User cancelled the authorization',
      };

      await finishInteraction(this.provider, req, res, result);

      logger.info('OIDC Interaction aborted', {
        uid: details.uid,
      });
    } catch (error) {
      logger.error('OIDC Abort interaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };

  /**
   * GET /interaction/:uid/data
   * Get interaction data for client-side rendering
   */
  getInteractionData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const details = await getInteractionDetails(
        this.provider,
        req,
        res
      );

      const { uid, prompt, params, session } = details;

      // Get client info
      const client = await this.provider.Client.find(
        params.client_id as string
      );

      if (!client) {
        res.status(404).json({
          error: 'client_not_found',
          message: 'OAuth client not found',
        });
        return;
      }

      // Return sanitized interaction data
      res.json({
        uid,
        prompt: prompt.name,
        client: {
          clientId: client.clientId,
          clientName: (client.metadata() as any).client_name || client.clientId,
        },
        params: {
          scope: params.scope,
          redirectUri: params.redirect_uri,
        },
        session: session
          ? {
              accountId: session.accountId,
            }
          : null,
      });
    } catch (error) {
      logger.error('Failed to get interaction data', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
}
