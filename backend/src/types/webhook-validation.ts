/**
 * Webhook Validation Schemas
 *
 * Zod schemas for validating webhook configuration and test requests.
 */

import { z } from 'zod';

/**
 * Validate webhook URL
 * - Must be a valid URL
 * - Must use HTTPS in production (HTTP allowed in development)
 * - No private/localhost IPs in production
 */
const webhookUrlSchema = z
  .string()
  .url('Invalid webhook URL format')
  .refine(
    (url) => {
      // In production, require HTTPS
      if (process.env.NODE_ENV === 'production') {
        return url.startsWith('https://');
      }
      // In development, allow HTTP
      return url.startsWith('http://') || url.startsWith('https://');
    },
    {
      message: 'Webhook URL must use HTTPS in production',
    }
  )
  .refine(
    (url) => {
      // In production, block private IPs and localhost
      if (process.env.NODE_ENV === 'production') {
        const hostname = new URL(url).hostname;
        const privatePatterns = [
          /^localhost$/i,
          /^127\.\d+\.\d+\.\d+$/,
          /^10\.\d+\.\d+\.\d+$/,
          /^192\.168\.\d+\.\d+$/,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/,
        ];

        return !privatePatterns.some((pattern) => pattern.test(hostname));
      }
      return true;
    },
    {
      message: 'Webhook URL cannot use private IP addresses in production',
    }
  );

/**
 * Validate webhook secret
 * - Minimum length: 16 characters
 * - Recommended: Use generateWebhookSecret() utility
 */
const webhookSecretSchema = z
  .string()
  .min(16, 'Webhook secret must be at least 16 characters')
  .max(255, 'Webhook secret must not exceed 255 characters');

/**
 * Schema for creating/updating webhook configuration
 */
export const webhookConfigSchema = z.object({
  webhook_url: webhookUrlSchema,
  webhook_secret: webhookSecretSchema,
});

export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>;

/**
 * Schema for testing webhook endpoint
 */
export const testWebhookSchema = z.object({
  event_type: z.enum([
    'subscription.created',
    'subscription.cancelled',
    'subscription.updated',
    'credits.depleted',
    'credits.low',
  ]),
});

export type TestWebhookInput = z.infer<typeof testWebhookSchema>;
