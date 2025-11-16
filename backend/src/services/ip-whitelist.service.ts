/**
 * IP Whitelist Service
 *
 * Manages IP whitelist entries for Super Admin users.
 * Supports CIDR notation for flexible IP range definitions.
 * Provides validation and matching capabilities for IP addresses.
 *
 * Reference: docs/plan/119-user-role-permission-rbac-design.md
 * Reference: docs/plan/130-gap-closure-implementation-plan.md (G-001)
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { IIPWhitelistService, IPWhitelistResponse } from '../interfaces';

// =============================================================================
// IP Whitelist Service Class
// =============================================================================

@injectable()
export class IPWhitelistService implements IIPWhitelistService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    logger.debug('IPWhitelistService: Initialized');
  }

  // ===========================================================================
  // Add IP to Whitelist
  // ===========================================================================

  /**
   * Add an IP address or CIDR range to the whitelist
   */
  async addIPToWhitelist(
    userId: string,
    ipAddress: string,
    description?: string
  ): Promise<IPWhitelistResponse> {
    logger.info('IPWhitelistService: Adding IP to whitelist', { userId, ipAddress });

    // Validate CIDR notation
    if (!this.validateCIDR(ipAddress)) {
      throw new Error(`Invalid IP address or CIDR notation: ${ipAddress}`);
    }

    try {
      // Check if this IP already exists for this user
      const existing = await this.prisma.ip_whitelists.findFirst({
        where: {
          user_id: userId,
          ip_address: ipAddress,
        },
      });

      if (existing) {
        throw new Error(`IP address ${ipAddress} is already whitelisted for this user`);
      }

      const entry = await this.prisma.ip_whitelists.create({
        data: {
          user_id: userId,
          ip_address: ipAddress,
          description: description || null,
          is_active: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('IPWhitelistService: IP added to whitelist', {
        entryId: entry.id,
        userId,
        ipAddress,
      });

      return this.mapToResponse(entry);
    } catch (error) {
      logger.error('IPWhitelistService: Failed to add IP to whitelist', {
        error,
        userId,
        ipAddress,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Remove IP from Whitelist
  // ===========================================================================

  /**
   * Remove an IP address from the whitelist (hard delete)
   */
  async removeIPFromWhitelist(entryId: string, userId: string): Promise<IPWhitelistResponse> {
    logger.info('IPWhitelistService: Removing IP from whitelist', { entryId, userId });

    try {
      // First, verify the entry exists and belongs to the user
      const existing = await this.prisma.ip_whitelists.findUnique({
        where: { id: entryId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error(`Whitelist entry not found: ${entryId}`);
      }

      if (existing.user_id !== userId) {
        throw new Error('Cannot remove whitelist entry belonging to another user');
      }

      // Delete the entry
      await this.prisma.ip_whitelists.delete({
        where: { id: entryId },
      });

      logger.info('IPWhitelistService: IP removed from whitelist', { entryId, userId });

      return this.mapToResponse(existing);
    } catch (error) {
      logger.error('IPWhitelistService: Failed to remove IP from whitelist', {
        error,
        entryId,
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Get Whitelist Entries
  // ===========================================================================

  /**
   * Get all whitelist entries for a user
   */
  async getUserWhitelist(userId: string): Promise<IPWhitelistResponse[]> {
    logger.debug('IPWhitelistService: Getting user whitelist', { userId });

    try {
      const entries = await this.prisma.ip_whitelists.findMany({
        where: { user_id: userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return entries.map((entry) => this.mapToResponse(entry));
    } catch (error) {
      logger.error('IPWhitelistService: Failed to get user whitelist', { error, userId });
      throw new Error(`Failed to get user whitelist: ${error}`);
    }
  }

  /**
   * Get all active whitelist entries for a user
   */
  async getActiveUserWhitelist(userId: string): Promise<IPWhitelistResponse[]> {
    logger.debug('IPWhitelistService: Getting active user whitelist', { userId });

    try {
      const entries = await this.prisma.ip_whitelists.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return entries.map((entry) => this.mapToResponse(entry));
    } catch (error) {
      logger.error('IPWhitelistService: Failed to get active user whitelist', {
        error,
        userId,
      });
      throw new Error(`Failed to get active user whitelist: ${error}`);
    }
  }

  // ===========================================================================
  // Check IP Whitelisting
  // ===========================================================================

  /**
   * Check if an IP address is whitelisted for a user
   */
  async isIPWhitelisted(userId: string, ipAddress: string): Promise<boolean> {
    logger.debug('IPWhitelistService: Checking if IP is whitelisted', { userId, ipAddress });

    try {
      // Get all active whitelist entries for this user
      const entries = await this.prisma.ip_whitelists.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      // Check if the IP matches any whitelisted entry
      for (const entry of entries) {
        if (this.ipMatchesCIDR(ipAddress, entry.ip_address)) {
          logger.debug('IPWhitelistService: IP is whitelisted', {
            userId,
            ipAddress,
            matchedEntry: entry.ip_address,
          });
          return true;
        }
      }

      logger.debug('IPWhitelistService: IP is not whitelisted', { userId, ipAddress });
      return false;
    } catch (error) {
      logger.error('IPWhitelistService: Failed to check IP whitelist', {
        error,
        userId,
        ipAddress,
      });
      throw new Error(`Failed to check IP whitelist: ${error}`);
    }
  }

  // ===========================================================================
  // Activate/Deactivate Entries
  // ===========================================================================

  /**
   * Activate a whitelist entry
   */
  async activateEntry(entryId: string, userId: string): Promise<IPWhitelistResponse> {
    logger.info('IPWhitelistService: Activating entry', { entryId, userId });

    return this.updateEntryStatus(entryId, userId, true);
  }

  /**
   * Deactivate a whitelist entry (soft delete)
   */
  async deactivateEntry(entryId: string, userId: string): Promise<IPWhitelistResponse> {
    logger.info('IPWhitelistService: Deactivating entry', { entryId, userId });

    return this.updateEntryStatus(entryId, userId, false);
  }

  /**
   * Update whitelist entry description
   */
  async updateDescription(
    entryId: string,
    userId: string,
    description: string
  ): Promise<IPWhitelistResponse> {
    logger.info('IPWhitelistService: Updating entry description', { entryId, userId });

    try {
      // First, verify the entry exists and belongs to the user
      const existing = await this.prisma.ip_whitelists.findUnique({
        where: { id: entryId },
      });

      if (!existing) {
        throw new Error(`Whitelist entry not found: ${entryId}`);
      }

      if (existing.user_id !== userId) {
        throw new Error('Cannot update whitelist entry belonging to another user');
      }

      // Update the description
      const updated = await this.prisma.ip_whitelists.update({
        where: { id: entryId },
        data: { description },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('IPWhitelistService: Entry description updated', { entryId });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('IPWhitelistService: Failed to update entry description', {
        error,
        entryId,
        userId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // CIDR Validation
  // ===========================================================================

  /**
   * Validate CIDR notation or single IP address
   */
  validateCIDR(ipAddress: string): boolean {
    // Check if it's a single IP address
    const singleIPRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // Check if it's CIDR notation (IP/prefix)
    const cidrRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[12][0-9]|3[0-2])$/;

    if (singleIPRegex.test(ipAddress)) {
      logger.debug('IPWhitelistService: Valid single IP address', { ipAddress });
      return true;
    }

    if (cidrRegex.test(ipAddress)) {
      logger.debug('IPWhitelistService: Valid CIDR notation', { ipAddress });
      return true;
    }

    logger.warn('IPWhitelistService: Invalid IP address or CIDR notation', { ipAddress });
    return false;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Update entry active status
   */
  private async updateEntryStatus(
    entryId: string,
    userId: string,
    isActive: boolean
  ): Promise<IPWhitelistResponse> {
    try {
      // First, verify the entry exists and belongs to the user
      const existing = await this.prisma.ip_whitelists.findUnique({
        where: { id: entryId },
      });

      if (!existing) {
        throw new Error(`Whitelist entry not found: ${entryId}`);
      }

      if (existing.user_id !== userId) {
        throw new Error('Cannot update whitelist entry belonging to another user');
      }

      // Update the status
      const updated = await this.prisma.ip_whitelists.update({
        where: { id: entryId },
        data: { is_active: isActive },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      logger.info('IPWhitelistService: Entry status updated', { entryId, isActive });

      return this.mapToResponse(updated);
    } catch (error) {
      logger.error('IPWhitelistService: Failed to update entry status', {
        error,
        entryId,
        userId,
        isActive,
      });
      throw error;
    }
  }

  /**
   * Check if an IP address matches a CIDR range
   */
  private ipMatchesCIDR(ipAddress: string, cidr: string): boolean {
    // If cidr doesn't contain '/', it's a single IP - do exact match
    if (!cidr.includes('/')) {
      return ipAddress === cidr;
    }

    const [range, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    // Convert IP addresses to 32-bit integers
    const ipInt = this.ipToInt(ipAddress);
    const rangeInt = this.ipToInt(range);

    // Create a mask based on prefix length
    const mask = -1 << (32 - prefix);

    // Compare the network portions
    return (ipInt & mask) === (rangeInt & mask);
  }

  /**
   * Convert an IP address string to a 32-bit integer
   */
  private ipToInt(ip: string): number {
    const parts = ip.split('.').map((part) => parseInt(part, 10));
    return (
      (parts[0] << 24) + // Shift first octet 24 bits left
      (parts[1] << 16) + // Shift second octet 16 bits left
      (parts[2] << 8) + // Shift third octet 8 bits left
      parts[3]
    ); // Fourth octet as is
  }

  /**
   * Map Prisma model to response type
   */
  private mapToResponse(entry: any): IPWhitelistResponse {
    return {
      id: entry.id,
      userId: entry.user_id,
      ipAddress: entry.ip_address,
      description: entry.description,
      isActive: entry.is_active,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      user: entry.user
        ? {
            id: entry.user.id,
            email: entry.user.email,
          }
        : undefined,
    };
  }
}
