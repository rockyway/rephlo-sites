/**
 * swagger-jsdoc Configuration (POC)
 *
 * This configuration demonstrates how to generate OpenAPI specs
 * from JSDoc annotations in TypeScript route files.
 *
 * Usage:
 *   tsx swagger-jsdoc.config.ts > docs/openapi/generated-api.yaml
 */

import swaggerJsdoc from 'swagger-jsdoc';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yamljs';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Rephlo Backend API (Generated)',
      description: `
        Complete REST API documentation for the Rephlo Backend system.

        **This specification is auto-generated from JSDoc annotations.**

        This API provides endpoints for:
        - OAuth 2.0 / OpenID Connect authentication
        - AI model inference and management
        - User profile and preferences
        - Credit and usage tracking
        - Subscription management
        - Webhook configuration
        - Public branding website endpoints
        - Administrative endpoints

        ## Authentication
        Most endpoints require Bearer token authentication using JWT access tokens
        obtained through the OAuth 2.0 authorization flow.

        ## Rate Limiting
        Rate limits vary by endpoint and are documented per endpoint.
        Rate limit headers are included in responses:
        - \`X-RateLimit-Limit\` - Maximum requests per window
        - \`X-RateLimit-Remaining\` - Remaining requests
        - \`X-RateLimit-Reset\` - Time when the limit resets

        ## OAuth Scopes
        - \`openid\` - OpenID Connect basic scope
        - \`profile\` - User profile information
        - \`email\` - User email address
        - \`user.info\` - Access to user profile and preferences
        - \`credits.read\` - Access to credit information
        - \`models.read\` - Access to model information
        - \`llm.inference\` - Permission to make inference requests
      `,
      version: '3.0.0',
      contact: {
        name: 'API Support',
        url: 'https://textassistant.com/support',
        email: 'support@textassistant.com',
      },
    },
    servers: [
      {
        url: 'https://api.textassistant.com',
        description: 'Production API',
      },
      {
        url: 'https://staging-api.textassistant.com',
        description: 'Staging API',
      },
      {
        url: 'http://localhost:7150',
        description: 'Local Development',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check and status endpoints' },
      { name: 'Branding', description: 'Public branding website endpoints (no authentication)' },
      { name: 'Authentication', description: 'OAuth 2.0 / OIDC authentication endpoints' },
      { name: 'Users', description: 'User profile and preferences management' },
      { name: 'Credits', description: 'Credit balance and usage tracking' },
      { name: 'Models', description: 'Available AI models and inference endpoints' },
      { name: 'Subscriptions', description: 'Subscription plans and management' },
      { name: 'Webhooks', description: 'User webhook configuration' },
      { name: 'Admin', description: 'Administrative endpoints (admin only)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained through OAuth 2.0 authorization flow',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Missing or invalid JWT token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'UNAUTHORIZED',
                      },
                      message: {
                        type: 'string',
                        example: 'Authentication required',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'FORBIDDEN',
                      },
                      message: {
                        type: 'string',
                        example: 'Insufficient permissions',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'RATE_LIMIT_EXCEEDED',
                      },
                      message: {
                        type: 'string',
                        example: 'Too many requests',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'INTERNAL_SERVER_ERROR',
                      },
                      message: {
                        type: 'string',
                        example: 'An unexpected error occurred',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    // Scan route files for @openapi annotations
    './src/routes/**/*.routes.ts',
    './src/routes/**/*.jsdoc-example.ts', // POC file
    // Optionally scan controller files for schema definitions
    // './src/controllers/**/*.controller.ts',
  ],
};

// Generate OpenAPI specification
const openapiSpecification = swaggerJsdoc(options);

// Output as YAML
console.log(YAML.stringify(openapiSpecification, 10, 2));

// Alternatively, save to file
const outputPath = path.join(__dirname, 'docs', 'openapi', 'generated-api.yaml');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, YAML.stringify(openapiSpecification, 10, 2));

console.error(`\n✅ OpenAPI spec generated: ${outputPath}\n`);
