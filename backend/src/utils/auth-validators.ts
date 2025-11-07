/**
 * Authentication Validation Schemas
 *
 * Zod schemas for authentication-related endpoints:
 * - Logout
 * - Account deactivation
 * - Account deletion
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 2)
 */

import { z } from 'zod';

/**
 * Logout request schema
 * Accepts token and optional refreshToken for revocation
 */
export const logoutSchema = z.object({
  token: z.string().optional(),
  refreshToken: z.string().optional(),
});

/**
 * Deactivate account request schema
 * Requires password confirmation and optional reason
 */
export const deactivateAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  reason: z.string().optional(),
});

/**
 * Delete account request schema
 * Requires password and exact confirmation text
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Confirmation must be exactly "DELETE"' }),
  }),
});

// Type exports for TypeScript
export type LogoutInput = z.infer<typeof logoutSchema>;
export type DeactivateAccountInput = z.infer<typeof deactivateAccountSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
