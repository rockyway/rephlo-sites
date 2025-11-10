/**
 * User Suspension Service Interface
 *
 * Defines the contract for user suspension management operations.
 * Supports temporary and permanent suspensions with automatic expiration.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

export interface IUserSuspensionService {
  /**
   * Suspend a user temporarily
   * @param userId - User ID to suspend
   * @param suspendedBy - Admin user ID performing the suspension
   * @param reason - Reason for suspension
   * @param expiresAt - When the suspension should automatically expire (null for permanent)
   * @returns Created suspension record
   */
  suspendUser(
    userId: string,
    suspendedBy: string,
    reason: string,
    expiresAt: Date | null
  ): Promise<UserSuspensionResponse>;

  /**
   * Lift (remove) a user suspension before expiration
   * @param suspensionId - Suspension record ID
   * @param liftedBy - Admin user ID lifting the suspension
   * @param liftReason - Reason for lifting the suspension
   * @returns Updated suspension record
   * @throws Error if suspension not found or already lifted/expired
   */
  liftSuspension(
    suspensionId: string,
    liftedBy: string,
    liftReason: string
  ): Promise<UserSuspensionResponse>;

  /**
   * Get all suspensions for a user
   * @param userId - User ID
   * @returns List of suspension records (active and historical)
   */
  getUserSuspensions(userId: string): Promise<UserSuspensionResponse[]>;

  /**
   * Get active suspension for a user (if any)
   * @param userId - User ID
   * @returns Active suspension record or null
   */
  getActiveSuspension(userId: string): Promise<UserSuspensionResponse | null>;

  /**
   * Check if a user is currently suspended
   * @param userId - User ID
   * @returns True if user has an active suspension
   */
  isUserSuspended(userId: string): Promise<boolean>;

  /**
   * Auto-expire suspensions that have passed their expiration time
   * @returns Number of suspensions expired
   */
  expireSuspensions(): Promise<number>;

  /**
   * Get all suspensions (with optional filtering)
   * @param filters - Optional filters
   * @returns List of suspension records
   */
  getAllSuspensions(filters?: SuspensionFilters): Promise<UserSuspensionResponse[]>;

  /**
   * Extend a suspension's expiration time
   * @param suspensionId - Suspension record ID
   * @param newExpiresAt - New expiration time (null for permanent)
   * @param extendedBy - Admin user ID extending the suspension
   * @param extendReason - Reason for extension
   * @returns Updated suspension record
   */
  extendSuspension(
    suspensionId: string,
    newExpiresAt: Date | null,
    extendedBy: string,
    extendReason: string
  ): Promise<UserSuspensionResponse>;
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface UserSuspensionResponse {
  id: string;
  userId: string;
  suspendedBy: string;
  reason: string;
  expiresAt: Date | null;
  liftedAt: Date | null;
  liftedBy: string | null;
  liftReason: string | null;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name: string | null;
    status: string;
  };
  suspender?: {
    id: string;
    email: string;
    name: string | null;
  };
  lifter?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

export interface SuspensionFilters {
  userId?: string;
  suspendedBy?: string;
  active?: boolean; // true = only active, false = only lifted/expired, undefined = all
  createdAfter?: Date;
  createdBefore?: Date;
}
