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
  private prisma: PrismaClient;

  constructor(provider: Provider, prisma: PrismaClient) {
    this.provider = provider;
    this.authService = new AuthService(prisma);
    this.prisma = prisma;
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
   *
   * Handles session cookie issues by attempting alternative approaches:
   * 1. First tries normal finishInteraction (with session validation)
   * 2. If SessionNotFound occurs, attempts to reload interaction context and retry
   * 3. If still missing, logs detailed info and returns user-friendly error
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const uid = req.params.uid;

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

      try {
        // Try standard interaction finish (requires session cookie)
        await finishInteraction(this.provider, req, res, result);
        logger.info('OIDC: login interaction success', { userId: user.id });
      } catch (error) {
        // Handle SessionNotFound error - occurs when session cookie is missing
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (errorMsg.includes('SessionNotFound') || errorMsg.includes('invalid_request')) {
          logger.warn('OIDC: Session not found during login, attempting recovery', {
            uid,
            userId: user.id,
            error: errorMsg,
          });

          // Try to load interaction details to validate the UID and interaction state
          // This helps distinguish between invalid UID vs. missing session cookie
          try {
            const details = await getInteractionDetails(
              this.provider,
              req,
              res
            );

            logger.info('OIDC: Interaction found, retrying finish', {
              uid: details.uid,
              userId: user.id,
            });

            // Retry finishInteraction with fresh context
            await finishInteraction(this.provider, req, res, result);
            logger.info('OIDC: login interaction success (retry)', { userId: user.id });
          } catch (retryError) {
            // If interaction still can't be found, it might be an invalid/expired UID
            const retryErrorMsg = retryError instanceof Error ? retryError.message : String(retryError);

            logger.error('OIDC: Failed to recover session', {
              uid,
              userId: user.id,
              originalError: errorMsg,
              retryError: retryErrorMsg,
            });

            // Return user-friendly error with recovery instructions
            res.status(400).json({
              error: 'session_expired',
              message: 'Your login session has expired. Please refresh the page and try again.',
              details: {
                suggestion: 'Close the login window and try the OAuth flow again from the beginning',
              },
            });
            return;
          }
        } else {
          // Re-throw if it's a different kind of error
          throw error;
        }
      }

      // Check if client should auto-approve consent
      // This is handled in a separate step after successful login
      await this.tryAutoApproveConsent(req, res, user.id);
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

  /**
   * Auto-approve consent for first-party trusted apps
   *
   * After successful login, checks if the OAuth client should skip the consent screen.
   * If enabled, automatically approves all requested scopes without user interaction.
   * This is safe for first-party apps (e.g., official desktop client) but should NOT
   * be enabled for third-party applications that require explicit user consent.
   */
  private tryAutoApproveConsent = async (
    req: Request,
    res: Response,
    userId: string
  ): Promise<void> => {
    try {
      const details = await getInteractionDetails(
        this.provider,
        req,
        res
      );

      const {
        prompt: { name },
        params,
        session,
      } = details;

      // Only auto-approve if interaction prompt is 'consent'
      if (name !== 'consent') {
        logger.debug('OIDC: Not a consent prompt, skipping auto-approve', {
          prompt: name,
          clientId: params.client_id,
        });
        return;
      }

      // Load client configuration to check skipConsentScreen setting
      const client = await this.provider.Client.find(
        params.client_id as string
      );

      if (!client) {
        logger.warn('OIDC: Client not found for auto-consent check', {
          clientId: params.client_id,
        });
        return;
      }

      // Get client config from database
      const dbClient = await this.prisma.oAuthClient.findUnique({
        where: { clientId: client.clientId },
      });

      if (!dbClient) {
        logger.warn('OIDC: OAuth client not found in database', {
          clientId: client.clientId,
        });
        return;
      }

      // Check if skipConsentScreen is enabled in config
      const config = (dbClient.config as any) || {};
      const shouldSkipConsent = config.skipConsentScreen === true;

      if (!shouldSkipConsent) {
        logger.debug('OIDC: skipConsentScreen not enabled, user must approve consent', {
          clientId: client.clientId,
        });
        return;
      }

      // Auto-approve consent for all requested scopes
      logger.info('OIDC: Auto-approving consent for first-party app', {
        clientId: client.clientId,
        userId,
      });

      // Get requested scopes
      const requestedScopes = (params.scope as string)?.split(' ') || [];

      // Create grant with all requested scopes
      const grant = new this.provider.Grant({
        accountId: session?.accountId || userId,
        clientId: params.client_id as string,
      });

      // Add OIDC scopes
      grant.addOIDCScope(requestedScopes.join(' '));

      // Save grant
      const grantId = await grant.save();

      // Complete consent interaction automatically
      const result = {
        consent: {
          grantId,
        },
      };

      await finishInteraction(this.provider, req, res, result);

      logger.info('OIDC: Auto-consent approved successfully', {
        clientId: client.clientId,
        userId,
        grantId,
        scopes: requestedScopes,
      });
    } catch (error) {
      // Log but don't fail the login if auto-consent fails
      // User will see the consent screen if auto-approve fails
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn('OIDC: Auto-consent approval failed (user will see consent screen)', {
        userId,
        error: errorMsg,
      });
      // Don't rethrow - let the normal consent flow handle this
    }
  };
}
