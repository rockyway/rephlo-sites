/**
 * IP Whitelist Service Interface
 *
 * Defines the contract for IP whitelist management operations.
 * Supports CIDR notation for flexible IP range definitions.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

export interface IIPWhitelistService {
  /**
   * Add an IP address or CIDR range to the whitelist
   * @param userId - Super Admin user ID
   * @param ipAddress - IP address or CIDR notation (e.g., "192.168.1.0/24")
   * @param description - Optional description of the IP address
   * @returns Created whitelist entry
   * @throws Error if IP address is invalid or already exists
   */
  addIPToWhitelist(
    userId: string,
    ipAddress: string,
    description?: string
  ): Promise<IPWhitelistResponse>;

  /**
   * Remove an IP address from the whitelist
   * @param entryId - Whitelist entry ID
   * @param userId - User ID (must match the entry's user ID)
   * @returns Deleted whitelist entry
   * @throws Error if entry not found or user mismatch
   */
  removeIPFromWhitelist(entryId: string, userId: string): Promise<IPWhitelistResponse>;

  /**
   * Get all whitelist entries for a user
   * @param userId - User ID
   * @returns List of whitelist entries
   */
  getUserWhitelist(userId: string): Promise<IPWhitelistResponse[]>;

  /**
   * Get all active whitelist entries for a user
   * @param userId - User ID
   * @returns List of active whitelist entries
   */
  getActiveUserWhitelist(userId: string): Promise<IPWhitelistResponse[]>;

  /**
   * Check if an IP address is whitelisted for a user
   * @param userId - User ID
   * @param ipAddress - IP address to check
   * @returns True if the IP is whitelisted (active entry exists)
   */
  isIPWhitelisted(userId: string, ipAddress: string): Promise<boolean>;

  /**
   * Activate a whitelist entry
   * @param entryId - Whitelist entry ID
   * @param userId - User ID (must match the entry's user ID)
   * @returns Updated whitelist entry
   */
  activateEntry(entryId: string, userId: string): Promise<IPWhitelistResponse>;

  /**
   * Deactivate a whitelist entry (soft delete)
   * @param entryId - Whitelist entry ID
   * @param userId - User ID (must match the entry's user ID)
   * @returns Updated whitelist entry
   */
  deactivateEntry(entryId: string, userId: string): Promise<IPWhitelistResponse>;

  /**
   * Update whitelist entry description
   * @param entryId - Whitelist entry ID
   * @param userId - User ID (must match the entry's user ID)
   * @param description - New description
   * @returns Updated whitelist entry
   */
  updateDescription(
    entryId: string,
    userId: string,
    description: string
  ): Promise<IPWhitelistResponse>;

  /**
   * Validate CIDR notation
   * @param ipAddress - IP address or CIDR notation
   * @returns True if valid CIDR notation
   */
  validateCIDR(ipAddress: string): boolean;
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface IPWhitelistResponse {
  id: string;
  userId: string;
  ipAddress: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
  };
}
