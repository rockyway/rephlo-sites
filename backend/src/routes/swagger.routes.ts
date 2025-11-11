/**
 * Swagger UI Routes
 *
 * Provides interactive API documentation using Swagger UI.
 * Serves the OpenAPI specification from docs/openapi/enhanced-api.yaml
 *
 * Endpoints:
 * - GET /api-docs - Swagger UI interface
 * - GET /api-docs/swagger.json - OpenAPI spec in JSON format
 *
 * Reference: backend/docs/openapi/enhanced-api.yaml
 */

import { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import logger from '../utils/logger';

/**
 * Create Swagger UI router
 * @returns Express router configured with Swagger UI
 */
export function createSwaggerRouter(): Router {
  const router = Router();

  try {
    // Load OpenAPI specification from YAML file
    const swaggerDocPath = path.join(__dirname, '../../docs/openapi/enhanced-api.yaml');
    const swaggerDocument = YAML.load(swaggerDocPath);

    logger.info('Swagger: Loaded OpenAPI specification', {
      path: swaggerDocPath,
      title: swaggerDocument?.info?.title,
      version: swaggerDocument?.info?.version,
    });

    // Swagger UI configuration options
    const swaggerOptions = {
      explorer: true, // Enable API explorer
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { margin: 20px 0; }
      `,
      customSiteTitle: 'Rephlo API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true, // Remember authorization between page refreshes
        displayRequestDuration: true, // Show request duration
        filter: true, // Enable filtering by tag
        tryItOutEnabled: true, // Enable "Try it out" by default
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      },
    };

    // Serve Swagger UI at /api-docs
    router.use('/', swaggerUi.serve);
    router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

    // Serve raw OpenAPI spec as JSON
    router.get('/swagger.json', (_req: Request, res: Response) => {
      res.json(swaggerDocument);
    });

    logger.info('Swagger: Routes configured successfully');
  } catch (error) {
    logger.error('Swagger: Failed to load OpenAPI specification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return error page if OpenAPI spec cannot be loaded
    router.get('/', (_req: Request, res: Response) => {
      res.status(500).json({
        error: {
          code: 'swagger_config_error',
          message: 'Failed to load API documentation',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    });
  }

  return router;
}

/**
 * Default export for backward compatibility
 */
export default createSwaggerRouter();
