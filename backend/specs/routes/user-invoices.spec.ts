/**
 * Tspec API Specification - User Invoices Endpoint
 *
 * This file defines the OpenAPI spec for /api/user/invoices using Tspec.
 */

import { Tspec } from 'tspec';
import { ApiError } from '@rephlo/shared-types';

/**
 * Query parameters for invoice list
 */
export interface UserInvoicesQueryParams {
  /** Number of invoices to return (default: 10, max: 50) */
  limit?: number;
}

/**
 * Single Invoice
 * Stripe invoice data for user's subscription billing
 */
export interface Invoice {
  /** Stripe invoice ID */
  id: string;
  /** Invoice creation date */
  date: string;
  /** Amount in cents */
  amount: number;
  /** Currency code (e.g., "usd") */
  currency: string;
  /** Invoice status */
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  /** Stripe hosted invoice URL */
  invoiceUrl: string;
  /** PDF download URL */
  pdfUrl: string;
  /** Invoice description */
  description: string;
}

/**
 * User Invoices Response
 * List of invoices for authenticated user
 */
export interface UserInvoicesResponse {
  /** Array of invoices */
  invoices: Invoice[];
  /** Whether more invoices are available */
  hasMore: boolean;
  /** Total number of invoices returned */
  count: number;
}

/**
 * Tspec API specification for user invoices endpoint
 */
export type UserInvoicesApiSpec = Tspec.DefineApiSpec<{
  tags: ['Users'];
  paths: {
    '/api/user/invoices': {
      get: {
        summary: 'Get user invoices';
        description: `Retrieve invoice history for authenticated user.

Returns paginated list of invoices from Stripe with download URLs.

**Use Case**: Desktop app displays billing history with downloadable PDFs.

**Rate Limit**: 30 requests per minute`;
        security: 'bearerAuth';
        query: UserInvoicesQueryParams;
        responses: {
          /** Successful response with invoice list */
          200: UserInvoicesResponse;
          /** Unauthorized - Missing or invalid JWT token */
          401: ApiError;
          /** Forbidden - Insufficient scope (requires user.info) */
          403: ApiError;
          /** Rate limit exceeded */
          429: ApiError;
          /** Internal server error */
          500: ApiError;
        };
      };
    };
  };
}>;
