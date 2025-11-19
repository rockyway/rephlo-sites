/**
 * Authentication Service (Identity Provider)
 *
 * Simplified version for Identity Provider - contains only account lookup
 * and authentication methods needed for OIDC provider.
 *
 * Removed: User creation, registration, password management (handled by main API)
 */

import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../utils/logger';

export class AuthService {
  constructor(private prisma: PrismaClient) {
    logger.debug('AuthService: Initialized');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('AuthService: findByEmail failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('AuthService: findById failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Mask license key for security (show last 4 characters)
   * Example: REPHLO-V1-XXXX-XXXX-AB12 → REPHLO-V1-****-****-AB12
   */
  private maskLicenseKey(key: string): string {
    const parts = key.split('-');
    if (parts.length < 3) return key;

    return [
      parts[0], // REPHLO
      parts[1], // V1
      '****',
      '****',
      parts[parts.length - 1], // Last segment
    ].join('-');
  }

  /**
   * Authenticate user with email and password
   * @returns User object if authentication succeeds, null otherwise
   *
   * Note: MFA verification is handled separately in the OAuth flow.
   * If MFA_ENFORCEMENT_ENABLED=false, users with MFA enabled can still login
   * via OAuth without MFA verification. This is useful for development/testing.
   */
  async authenticate(
    email: string,
    password: string
  ): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);

      if (!user) {
        logger.warn('Login failed: User not found', { email });
        return null;
      }

      if (!user.isActive) {
        logger.warn('Login failed: Account inactive', { userId: user.id });
        return null;
      }

      if (!user.passwordHash) {
        logger.warn('Login failed: Password not set (OAuth-only account)', { userId: user.id });
        return null;
      }

      const isPasswordValid = await this.verifyPassword(
        password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        logger.warn('Login failed: Invalid password', { userId: user.id });
        return null;
      }

      // Check if MFA enforcement is enabled via environment variable
      const mfaEnforcementEnabled = process.env.MFA_ENFORCEMENT_ENABLED !== 'false';

      // If MFA is enabled for this user AND MFA enforcement is enabled globally
      if (user.mfaEnabled && mfaEnforcementEnabled) {
        logger.warn('Login failed: MFA verification required but not implemented in OAuth flow', {
          userId: user.id,
          mfaEnforcementEnabled,
        });
        // Note: In a full implementation, we would redirect to MFA verification page
        // For now, we fail the login if MFA is enabled and enforcement is on
        return null;
      }

      // Log if MFA is bypassed
      if (user.mfaEnabled && !mfaEnforcementEnabled) {
        logger.warn('Login success: MFA bypassed (MFA_ENFORCEMENT_ENABLED=false)', {
          userId: user.id,
          userMfaEnabled: user.mfaEnabled,
          mfaEnforcementEnabled,
        });
      }

      // Update last login timestamp
      await this.updateLastLogin(user.id);

      logger.info('Login success', {
        userId: user.id,
        mfaEnforcementEnabled,
        userHasMfa: user.mfaEnabled,
      });

      return user;
    } catch (error) {
      logger.error('AuthService: authenticate failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Find or create user by account ID (for OIDC provider)
   * The accountId is the user's UUID
   */
  async findAccount(accountId: string): Promise<{
    accountId: string;
    claims: (use: string, scope: string) => Promise<any>;
    getOIDCScopeFiltered: (scopes: string[]) => string[];
  } | undefined> {
    try {
      // Fetch user with perpetual license data (join query)
      const user = await this.prisma.user.findUnique({
        where: { id: accountId },
        include: {
          perpetualLicenses: {
            where: { status: 'active' },
            orderBy: { purchasedAt: 'desc' },
            take: 1, // Most recent active license
            select: {
              licenseKey: true,
              status: true,
              purchasedVersion: true,
              eligibleUntilVersion: true,
            },
          },
        },
      });

      if (!user) {
        return undefined;
      }

      // Get the most recent active license (if exists)
      const activeLicense = user.perpetualLicenses[0] || null;

      return {
        accountId: user.id,
        claims: async (_use: string, scope: string) => {
          return this.getClaimsForUser(user, scope, activeLicense);
        },
        /**
         * Filter OIDC scopes based on what the user has previously granted
         * This method is called by oidc-provider during consent flow
         * For now, we return all requested scopes (consent is handled via loadExistingGrant)
         */
        getOIDCScopeFiltered: (scopes: string[]) => {
          logger.debug('AuthService: getOIDCScopeFiltered called', {
            userId: user.id,
            requestedScopes: scopes,
          });
          // Return all OIDC scopes (openid, email, profile, offline_access)
          // Non-OIDC scopes are filtered by the provider
          const oidcScopes = ['openid', 'email', 'profile', 'offline_access'];
          return scopes.filter(scope => oidcScopes.includes(scope));
        },
      };
    } catch (error) {
      logger.error('AuthService: findAccount failed', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Get OIDC claims for a user based on requested scope
   * Now includes perpetual license information in JWT tokens
   */
  getClaimsForUser(
    user: User,
    scope: string,
    activeLicense?: {
      licenseKey: string;
      status: string;
      purchasedVersion: string;
      eligibleUntilVersion: string;
    } | null
  ): Record<string, any> {
    const scopes = scope.split(' ');
    const claims: Record<string, any> = {
      sub: user.id,
    };

    // openid scope (always included)
    // sub is always present

    // email scope
    if (scopes.includes('email')) {
      claims.email = user.email;
      claims.email_verified = user.emailVerified;
    }

    // profile scope
    if (scopes.includes('profile')) {
      if (user.firstName || user.lastName) {
        claims.name = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(' ');
      }
      if (user.firstName) claims.given_name = user.firstName;
      if (user.lastName) claims.family_name = user.lastName;
      if (user.username) claims.preferred_username = user.username;
      if (user.profilePictureUrl) claims.picture = user.profilePictureUrl;
      claims.updated_at = Math.floor(user.updatedAt.getTime() / 1000);
    }

    // Custom scopes (user.info)
    if (scopes.includes('user.info')) {
      claims.created_at = Math.floor(user.createdAt.getTime() / 1000);
      claims.last_login_at = user.lastLoginAt
        ? Math.floor(user.lastLoginAt.getTime() / 1000)
        : null;
      claims.is_active = user.isActive;
    }

    // Admin scope - include role claim for authorization
    if (scopes.includes('admin')) {
      claims.role = user.role || 'user';
      logger.debug('AuthService: Including role claim in token', {
        userId: user.id,
        role: claims.role,
      });

      // Future: Add permissions when RBAC implemented (Plan 119)
      // claims.permissions = await getUserPermissions(user.id);
    }

    // License claims - Add perpetual license information to JWT
    // This enables Desktop App auto-activation and offline validation
    if (activeLicense) {
      claims.licenseStatus = activeLicense.status; // 'active' | 'suspended' | 'revoked'
      claims.licenseKey = this.maskLicenseKey(activeLicense.licenseKey); // Masked for security
      claims.licenseTier = 'perpetual';
      claims.licenseVersion = activeLicense.purchasedVersion;

      logger.debug('AuthService: Including license claims in token', {
        userId: user.id,
        licenseStatus: claims.licenseStatus,
        maskedKey: claims.licenseKey,
      });
    } else {
      // No active license - user is on free tier or subscription
      claims.licenseStatus = null;
      claims.licenseTier = 'free'; // Default tier for users without perpetual license

      logger.debug('AuthService: No active license found, using free tier', {
        userId: user.id,
      });
    }

    return claims;
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('AuthService: password verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logger.error('AuthService: updateLastLogin failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
