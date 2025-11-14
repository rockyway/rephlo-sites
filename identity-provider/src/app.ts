/**
 * Identity Provider Express Application
 *
 * Creates and configures the Express app with:
 * - OIDC Provider middleware
 * - Security middleware (helmet, cors)
 * - Interaction routes (login, consent)
 * - Error handling
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createOIDCProvider } from './config/oidc';
import { AuthController } from './controllers/auth.controller';
import { errorHandler } from './middleware/error.middleware';
import { createSessionValidator } from './middleware/session-validator';
import logger from './utils/logger';

export async function createApp(prisma: PrismaClient) {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow inline scripts for login/consent pages
    })
  );

  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:8080',
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Create OIDC provider
  const oidcProvider = await createOIDCProvider(prisma);

  // Create auth controller
  const authController = new AuthController(oidcProvider, prisma);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'identity-provider',
      timestamp: new Date().toISOString(),
    });
  });

  // Interaction routes (must be before OIDC provider middleware)
  app.get('/interaction/:uid', authController.interaction);
  app.post('/interaction/:uid/login', authController.login);
  app.post('/interaction/:uid/consent', authController.consent);
  app.get('/interaction/:uid/abort', authController.abort);
  app.get('/interaction/:uid/data', authController.getInteractionData);

  // Logout route - clears OIDC session
  app.get('/logout', authController.logout);

  // CRITICAL: Session validation middleware (must run BEFORE oidcProvider)
  // Validates that sessions reference existing, active users
  // Destroys invalid sessions to prevent errors in OIDC authorization flow
  app.use(createSessionValidator(oidcProvider, prisma));

  // OIDC provider middleware (handles all OAuth endpoints)
  app.use('/', oidcProvider.callback());

  // Error handling middleware
  app.use(errorHandler);

  logger.info('Identity Provider app initialized');

  return { app, oidcProvider };
}
