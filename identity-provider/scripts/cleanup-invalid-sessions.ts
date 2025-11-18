/**
 * Cleanup Invalid OIDC Sessions Script
 *
 * Removes OIDC sessions that reference deleted or inactive users.
 * Run this script manually to clean up invalid sessions in the database.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-invalid-sessions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupInvalidSessions() {
  console.log('🔍 Starting invalid session cleanup...\n');

  try {
    // Find all active sessions
    const activeSessions = await prisma.oIDCModel.findMany({
      where: {
        kind: 'Session',
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        payload: true,
        expiresAt: true,
      },
    });

    console.log(`📊 Found ${activeSessions.length} active sessions\n`);

    if (activeSessions.length === 0) {
      console.log('✅ No sessions to validate. Exiting.\n');
      return;
    }

    // Validate each session
    const invalidSessionIds: string[] = [];
    let validCount = 0;
    let unauthenticatedCount = 0;

    for (const session of activeSessions) {
      try {
        // Parse the session payload
        const payload = typeof session.payload === 'string'
          ? JSON.parse(session.payload)
          : session.payload;

        // Check if session has an accountId
        const accountId = payload?.accountId || payload?.account;

        if (!accountId) {
          // Session doesn't have an accountId yet (not logged in)
          unauthenticatedCount++;
          continue;
        }

        // Validate that the accountId references an existing, active user
        const user = await prisma.user.findUnique({
          where: { id: accountId },
          select: { id: true, email: true, isActive: true },
        });

        if (!user) {
          console.log(`❌ Invalid session: ${session.id.substring(0, 12)}... - user not found (ID: ${accountId.substring(0, 12)}...)`);
          invalidSessionIds.push(session.id);
        } else if (!user.isActive) {
          console.log(`❌ Invalid session: ${session.id.substring(0, 12)}... - user inactive (${user.email})`);
          invalidSessionIds.push(session.id);
        } else {
          validCount++;
        }
      } catch (parseError) {
        console.error(`⚠️ Failed to parse session ${session.id.substring(0, 12)}...`, parseError);
      }
    }

    console.log('\n📊 Validation Summary:');
    console.log(`   ✅ Valid sessions: ${validCount}`);
    console.log(`   🔓 Unauthenticated sessions: ${unauthenticatedCount}`);
    console.log(`   ❌ Invalid sessions: ${invalidSessionIds.length}`);

    // Delete invalid sessions
    if (invalidSessionIds.length > 0) {
      console.log(`\n🗑️  Deleting ${invalidSessionIds.length} invalid sessions...`);

      const deleteResult = await prisma.oIDCModel.deleteMany({
        where: {
          id: {
            in: invalidSessionIds,
          },
          kind: 'Session',
        },
      });

      console.log(`✅ Deleted ${deleteResult.count} invalid sessions\n`);
    } else {
      console.log('\n✅ No invalid sessions to delete\n');
    }

    // Also clean up expired sessions (expiresAt < now)
    console.log('🔍 Cleaning up expired sessions...');

    const expiredDeleteResult = await prisma.oIDCModel.deleteMany({
      where: {
        kind: 'Session',
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`✅ Deleted ${expiredDeleteResult.count} expired sessions\n`);

    console.log('🎉 Cleanup complete!\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupInvalidSessions()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
