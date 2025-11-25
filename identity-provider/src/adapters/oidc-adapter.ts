/**
 * OIDC Provider PostgreSQL Adapter
 *
 * Implements the node-oidc-provider Adapter interface for PostgreSQL storage.
 * Stores OIDC sessions, tokens, authorization codes, and grants in the database.
 *
 * Reference: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#adapter
 */

import { PrismaClient } from '@prisma/client';
import type { AdapterPayload } from 'oidc-provider';
import logger from '../utils/logger';

// Supported OIDC model types
type ModelName =
  | 'Session'
  | 'AccessToken'
  | 'AuthorizationCode'
  | 'RefreshToken'
  | 'DeviceCode'
  | 'BackchannelAuthenticationRequest'
  | 'ClientCredentials'
  | 'Client'
  | 'InitialAccessToken'
  | 'RegistrationAccessToken'
  | 'Interaction'
  | 'ReplayDetection'
  | 'PushedAuthorizationRequest'
  | 'Grant';

// PostgreSQL table mapping for OIDC models
// We use a single table with discriminator (kind field)

/**
 * OIDCAdapter implements the Adapter interface required by node-oidc-provider.
 * Each instance handles a specific model type (e.g., Session, AccessToken).
 */
export class OIDCAdapter {
  private name: ModelName;
  private prisma: PrismaClient;

  constructor(name: ModelName, prisma: PrismaClient) {
    this.name = name;
    this.prisma = prisma;
  }

  /**
   * Insert or update a record
   * @param id - Unique identifier (jti for tokens)
   * @param payload - OIDC payload data
   * @param expiresIn - TTL in seconds
   */
  async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn: number
  ): Promise<void> {
    try {
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      // Store as JSON in a generic oidc_models table
      await this.prisma.$executeRaw`
        INSERT INTO oidc_models (id, kind, payload, expires_at, grant_id, user_code, uid)
        VALUES (
          ${id},
          ${this.name},
          ${JSON.stringify(payload)}::jsonb,
          ${expiresAt},
          ${payload.grantId || null},
          ${payload.userCode || null},
          ${payload.uid || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          payload = ${JSON.stringify(payload)}::jsonb,
          expires_at = ${expiresAt},
          grant_id = ${payload.grantId || null},
          user_code = ${payload.userCode || null},
          uid = ${payload.uid || null}
      `;

      // DIAGNOSTIC: Enhanced logging for token saves
      const tokenPreview = id.length > 20 ? `${id.substring(0, 10)}...${id.substring(id.length - 10)}` : id;
      logger.info(`OIDC Adapter: upsert ${this.name}`, {
        tokenPreview,
        tokenLength: id.length,
        expiresIn,
        expiresAt: expiresAt?.toISOString(),
        grantId: payload.grantId,
        ...(this.name === 'RefreshToken' && {
          refreshTokenDetails: {
            accountId: payload.accountId,
            clientId: payload.clientId,
            consumed: payload.consumed,
            expiresWithSession: payload.expiresWithSession,
            scope: payload.scope,
          },
        }),
      });
    } catch (error) {
      logger.error(`OIDC Adapter: upsert failed for ${this.name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find a record by ID
   * @param id - Unique identifier
   * @returns Payload or undefined if not found
   */
  async find(id: string): Promise<AdapterPayload | undefined> {
    try {
      // DIAGNOSTIC: Log lookup attempt with token preview
      const tokenPreview = id.length > 20 ? `${id.substring(0, 10)}...${id.substring(id.length - 10)}` : id;
      logger.info(`OIDC Adapter: Looking up ${this.name}`, {
        tokenPreview,
        tokenLength: id.length,
        kind: this.name,
      });

      const result = await this.prisma.$queryRaw<
        Array<{
          payload: any;
          expires_at: Date | null;
        }>
      >`
        SELECT payload, expires_at
        FROM oidc_models
        WHERE id = ${id} AND kind = ${this.name}
        LIMIT 1
      `;

      if (result.length === 0) {
        // DIAGNOSTIC: Check if token exists with different kind or was deleted
        const anyKindResult = await this.prisma.$queryRaw<
          Array<{
            kind: string;
            expires_at: Date | null;
          }>
        >`
          SELECT kind, expires_at
          FROM oidc_models
          WHERE id = ${id}
          LIMIT 1
        `;

        if (anyKindResult.length > 0) {
          logger.warn(`OIDC Adapter: ${this.name} not found but exists with different kind`, {
            tokenPreview,
            expectedKind: this.name,
            actualKind: anyKindResult[0].kind,
            expiresAt: anyKindResult[0].expires_at,
          });
        } else {
          // Check total count of this kind in database
          const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM oidc_models WHERE kind = ${this.name}
          `;
          logger.warn(`OIDC Adapter: ${this.name} not found in database`, {
            tokenPreview,
            totalRecordsOfKind: Number(countResult[0].count),
          });
        }
        return undefined;
      }

      const record = result[0];

      // Check if expired
      if (record.expires_at && record.expires_at < new Date()) {
        logger.debug(`OIDC Adapter: expired record ${this.name}`, { id });
        await this.destroy(id);
        return undefined;
      }

      logger.debug(`OIDC Adapter: found ${this.name}`, {
        id,
        expiresAt: record.expires_at,
        payloadKeys: Object.keys(record.payload || {}),
        ...(this.name === 'RefreshToken' && {
          refreshTokenDetails: {
            accountId: record.payload?.accountId,
            clientId: record.payload?.clientId,
            grantId: record.payload?.grantId,
            consumed: record.payload?.consumed,
            expiresWithSession: record.payload?.expiresWithSession,
          },
        }),
      });
      return record.payload;
    } catch (error) {
      logger.error(`OIDC Adapter: find failed for ${this.name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Find a record by user code (for device flow)
   * @param userCode - User code
   * @returns Payload or undefined if not found
   */
  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          payload: any;
          expires_at: Date | null;
        }>
      >`
        SELECT payload, expires_at
        FROM oidc_models
        WHERE user_code = ${userCode} AND kind = ${this.name}
        LIMIT 1
      `;

      if (result.length === 0) {
        return undefined;
      }

      const record = result[0];

      // Check if expired
      if (record.expires_at && record.expires_at < new Date()) {
        await this.prisma.$executeRaw`
          DELETE FROM oidc_models
          WHERE user_code = ${userCode} AND kind = ${this.name}
        `;
        return undefined;
      }

      return record.payload;
    } catch (error) {
      logger.error(`OIDC Adapter: findByUserCode failed for ${this.name}`, {
        userCode,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Find a record by UID (interaction UID)
   * @param uid - Unique interaction ID
   * @returns Payload or undefined if not found
   */
  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    try {
      const result = await this.prisma.$queryRaw<
        Array<{
          payload: any;
          expires_at: Date | null;
        }>
      >`
        SELECT payload, expires_at
        FROM oidc_models
        WHERE uid = ${uid} AND kind = ${this.name}
        LIMIT 1
      `;

      if (result.length === 0) {
        return undefined;
      }

      const record = result[0];

      // Check if expired
      if (record.expires_at && record.expires_at < new Date()) {
        await this.prisma.$executeRaw`
          DELETE FROM oidc_models
          WHERE uid = ${uid} AND kind = ${this.name}
        `;
        return undefined;
      }

      return record.payload;
    } catch (error) {
      logger.error(`OIDC Adapter: findByUid failed for ${this.name}`, {
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  /**
   * Mark a token as consumed (one-time use enforcement)
   * @param id - Unique identifier
   */
  async consume(id: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        UPDATE oidc_models
        SET payload = jsonb_set(payload, '{consumed}', to_jsonb(${Math.floor(
          Date.now() / 1000
        )}))
        WHERE id = ${id} AND kind = ${this.name}
      `;

      logger.debug(`OIDC Adapter: consumed ${this.name}`, { id });
    } catch (error) {
      logger.error(`OIDC Adapter: consume failed for ${this.name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete a record by ID
   * @param id - Unique identifier
   */
  async destroy(id: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM oidc_models
        WHERE id = ${id} AND kind = ${this.name}
      `;

      logger.debug(`OIDC Adapter: destroyed ${this.name}`, { id });
    } catch (error) {
      logger.error(`OIDC Adapter: destroy failed for ${this.name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Revoke all tokens associated with a grant ID
   * @param grantId - Grant ID (links tokens to same authorization)
   */
  async revokeByGrantId(grantId: string): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM oidc_models
        WHERE grant_id = ${grantId}
      `;

      logger.info(`OIDC Adapter: revoked all tokens for grantId`, {
        grantId,
      });
    } catch (error) {
      logger.error(
        `OIDC Adapter: revokeByGrantId failed for ${this.name}`,
        {
          grantId,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

/**
 * Adapter factory function for node-oidc-provider
 * @param prisma - Prisma client instance
 * @returns Adapter constructor
 */
export function createOIDCAdapterFactory(prisma: PrismaClient) {
  return (name: ModelName) => new OIDCAdapter(name, prisma);
}

/**
 * Initialize OIDC storage table
 * Creates the oidc_models table if it doesn't exist
 */
export async function initializeOIDCStorage(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS oidc_models (
        id VARCHAR(255) PRIMARY KEY,
        kind VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        expires_at TIMESTAMP,
        grant_id VARCHAR(255),
        user_code VARCHAR(50),
        uid VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oidc_models_kind ON oidc_models(kind);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oidc_models_grant_id ON oidc_models(grant_id);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oidc_models_user_code ON oidc_models(user_code);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oidc_models_uid ON oidc_models(uid);
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_oidc_models_expires_at ON oidc_models(expires_at);
    `;

    logger.info('OIDC storage initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize OIDC storage', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Cleanup expired OIDC records
 * Should be run periodically (e.g., every hour via cron job)
 */
export async function cleanupExpiredOIDCRecords(
  prisma: PrismaClient
): Promise<void> {
  try {
    const result = await prisma.$executeRaw`
      DELETE FROM oidc_models
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    logger.info('OIDC cleanup: removed expired records', {
      count: result,
    });
  } catch (error) {
    logger.error('OIDC cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
