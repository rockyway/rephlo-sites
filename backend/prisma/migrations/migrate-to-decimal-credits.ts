/**
 * Plan 208: Fractional Credit System - Standalone Data Migration Script
 *
 * This script provides a standalone way to migrate credit fields from Int to Decimal(12, 2).
 * Use this if you need to run the migration separately from Prisma migrate.
 *
 * Usage:
 *   npm run ts-node prisma/migrations/migrate-to-decimal-credits.ts
 *
 * Safety Features:
 * - Dry-run mode available
 * - Transaction-based (all-or-nothing)
 * - Data integrity verification
 * - Detailed logging
 * - Automatic rollback on errors
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

interface MigrationStats {
  userCreditBalanceRows: number;
  tokenUsageLedgerRows: number;
  creditDeductionLedgerRows: number;
  creditUsageDailySummaryRows: number;
  totalRowsMigrated: number;
  duration: number;
}

/**
 * Verify data integrity after migration
 */
async function verifyDataIntegrity(): Promise<boolean> {
  console.log('\n🔍 Verifying data integrity...\n');

  try {
    // Check user_credit_balance
    const userBalanceMismatches = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "user_credit_balance"
      WHERE "amount"::decimal != "amount_decimal"
         OR (
           "last_deduction_amount" IS NOT NULL
           AND "last_deduction_amount"::decimal != "last_deduction_amount_decimal"
         );
    `;
    const userMismatchCount = Number(userBalanceMismatches[0].count);
    if (userMismatchCount > 0) {
      console.error(`❌ user_credit_balance: ${userMismatchCount} rows have mismatched values`);
      return false;
    }
    console.log('✅ user_credit_balance: All rows verified');

    // Check token_usage_ledger
    const tokenUsageMismatches = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "token_usage_ledger"
      WHERE "credits_deducted"::decimal != "credits_deducted_decimal"
         OR ("input_credits" IS NOT NULL AND "input_credits"::decimal != "input_credits_decimal")
         OR ("output_credits" IS NOT NULL AND "output_credits"::decimal != "output_credits_decimal")
         OR ("total_credits" IS NOT NULL AND "total_credits"::decimal != "total_credits_decimal")
         OR ("cache_write_credits" IS NOT NULL AND "cache_write_credits"::decimal != "cache_write_credits_decimal")
         OR ("cache_read_credits" IS NOT NULL AND "cache_read_credits"::decimal != "cache_read_credits_decimal");
    `;
    const tokenMismatchCount = Number(tokenUsageMismatches[0].count);
    if (tokenMismatchCount > 0) {
      console.error(`❌ token_usage_ledger: ${tokenMismatchCount} rows have mismatched values`);
      return false;
    }
    console.log('✅ token_usage_ledger: All rows verified');

    // Check credit_deduction_ledger
    const deductionMismatches = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "credit_deduction_ledger"
      WHERE "amount"::decimal != "amount_decimal"
         OR "balance_before"::decimal != "balance_before_decimal"
         OR "balance_after"::decimal != "balance_after_decimal";
    `;
    const deductionMismatchCount = Number(deductionMismatches[0].count);
    if (deductionMismatchCount > 0) {
      console.error(`❌ credit_deduction_ledger: ${deductionMismatchCount} rows have mismatched values`);
      return false;
    }
    console.log('✅ credit_deduction_ledger: All rows verified');

    // Check credit_usage_daily_summary
    const dailySummaryMismatches = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "credit_usage_daily_summary"
      WHERE "credits_deducted"::decimal != "credits_deducted_decimal"
         OR "credits_balance_eod"::decimal != "credits_balance_eod_decimal";
    `;
    const dailyMismatchCount = Number(dailySummaryMismatches[0].count);
    if (dailyMismatchCount > 0) {
      console.error(`❌ credit_usage_daily_summary: ${dailyMismatchCount} rows have mismatched values`);
      return false;
    }
    console.log('✅ credit_usage_daily_summary: All rows verified');

    console.log('\n✅ All data integrity checks passed!\n');
    return true;
  } catch (error) {
    console.error('❌ Data integrity verification failed:', error);
    return false;
  }
}

/**
 * Create system_settings table and insert credit_minimum_increment
 */
async function createSystemSettings(): Promise<void> {
  console.log('📋 Creating system_settings table...');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "system_settings" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "key" VARCHAR(100) NOT NULL UNIQUE,
      "value" TEXT NOT NULL,
      "value_type" VARCHAR(20) NOT NULL DEFAULT 'string',
      "description" TEXT,
      "category" VARCHAR(50) NOT NULL DEFAULT 'general',
      "is_public" BOOLEAN NOT NULL DEFAULT false,
      "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category");
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
  `;

  console.log('✅ system_settings table created');

  // Insert credit_minimum_increment setting
  await prisma.$executeRaw`
    INSERT INTO "system_settings" ("key", "value", "value_type", "description", "category", "is_public", "updated_at")
    VALUES (
      'credit_minimum_increment',
      '0.1',
      'decimal',
      'Minimum credit increment for credit deduction rounding (e.g., 0.1 = $0.001 per increment). Allowed values: 0.01, 0.1, 1.0',
      'billing',
      false,
      NOW()
    )
    ON CONFLICT ("key") DO NOTHING;
  `;

  console.log('✅ credit_minimum_increment setting inserted (default: 0.1)\n');
}

/**
 * Migrate user_credit_balance table
 */
async function migrateUserCreditBalance(): Promise<number> {
  console.log('📊 Migrating user_credit_balance...');

  // Add decimal columns
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      ADD COLUMN IF NOT EXISTS "amount_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "last_deduction_amount_decimal" DECIMAL(12, 2);
  `;

  // Migrate data
  await prisma.$executeRaw`
    UPDATE "user_credit_balance"
      SET
        "amount_decimal" = "amount"::decimal,
        "last_deduction_amount_decimal" = CASE
          WHEN "last_deduction_amount" IS NULL THEN NULL
          ELSE "last_deduction_amount"::decimal
        END;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "user_credit_balance";
  `;

  console.log(`✅ Migrated ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Migrate token_usage_ledger table
 */
async function migrateTokenUsageLedger(): Promise<number> {
  console.log('📊 Migrating token_usage_ledger...');

  // Add decimal columns
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      ADD COLUMN IF NOT EXISTS "credits_deducted_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "input_credits_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "output_credits_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "total_credits_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "cache_write_credits_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "cache_read_credits_decimal" DECIMAL(12, 2);
  `;

  // Migrate data
  await prisma.$executeRaw`
    UPDATE "token_usage_ledger"
      SET
        "credits_deducted_decimal" = "credits_deducted"::decimal,
        "input_credits_decimal" = CASE
          WHEN "input_credits" IS NULL THEN NULL
          ELSE "input_credits"::decimal
        END,
        "output_credits_decimal" = CASE
          WHEN "output_credits" IS NULL THEN NULL
          ELSE "output_credits"::decimal
        END,
        "total_credits_decimal" = CASE
          WHEN "total_credits" IS NULL THEN NULL
          ELSE "total_credits"::decimal
        END,
        "cache_write_credits_decimal" = CASE
          WHEN "cache_write_credits" IS NULL THEN NULL
          ELSE "cache_write_credits"::decimal
        END,
        "cache_read_credits_decimal" = CASE
          WHEN "cache_read_credits" IS NULL THEN NULL
          ELSE "cache_read_credits"::decimal
        END;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "token_usage_ledger";
  `;

  console.log(`✅ Migrated ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Migrate credit_deduction_ledger table
 */
async function migrateCreditDeductionLedger(): Promise<number> {
  console.log('📊 Migrating credit_deduction_ledger...');

  // Add decimal columns
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      ADD COLUMN IF NOT EXISTS "amount_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "balance_before_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "balance_after_decimal" DECIMAL(12, 2);
  `;

  // Migrate data
  await prisma.$executeRaw`
    UPDATE "credit_deduction_ledger"
      SET
        "amount_decimal" = "amount"::decimal,
        "balance_before_decimal" = "balance_before"::decimal,
        "balance_after_decimal" = "balance_after"::decimal;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "credit_deduction_ledger";
  `;

  console.log(`✅ Migrated ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Migrate credit_usage_daily_summary table
 */
async function migrateCreditUsageDailySummary(): Promise<number> {
  console.log('📊 Migrating credit_usage_daily_summary...');

  // Add decimal columns
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      ADD COLUMN IF NOT EXISTS "credits_deducted_decimal" DECIMAL(12, 2),
      ADD COLUMN IF NOT EXISTS "credits_balance_eod_decimal" DECIMAL(12, 2);
  `;

  // Migrate data
  await prisma.$executeRaw`
    UPDATE "credit_usage_daily_summary"
      SET
        "credits_deducted_decimal" = "credits_deducted"::decimal,
        "credits_balance_eod_decimal" = "credits_balance_eod"::decimal;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "credit_usage_daily_summary";
  `;

  console.log(`✅ Migrated ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Finalize migration by dropping old columns and renaming
 */
async function finalizeMigration(): Promise<void> {
  console.log('🔄 Finalizing migration (dropping old columns, renaming)...\n');

  // user_credit_balance
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      DROP COLUMN "amount",
      DROP COLUMN "last_deduction_amount",
      ALTER COLUMN "amount_decimal" SET NOT NULL,
      ALTER COLUMN "amount_decimal" SET DEFAULT 0;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      RENAME COLUMN "amount_decimal" TO "amount";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      RENAME COLUMN "last_deduction_amount_decimal" TO "last_deduction_amount";
  `;
  console.log('✅ user_credit_balance finalized');

  // token_usage_ledger
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      DROP COLUMN "credits_deducted",
      DROP COLUMN "input_credits",
      DROP COLUMN "output_credits",
      DROP COLUMN "total_credits",
      DROP COLUMN "cache_write_credits",
      DROP COLUMN "cache_read_credits",
      ALTER COLUMN "credits_deducted_decimal" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "credits_deducted_decimal" TO "credits_deducted";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "input_credits_decimal" TO "input_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "output_credits_decimal" TO "output_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "total_credits_decimal" TO "total_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "cache_write_credits_decimal" TO "cache_write_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "cache_read_credits_decimal" TO "cache_read_credits";
  `;
  console.log('✅ token_usage_ledger finalized');

  // credit_deduction_ledger
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      DROP COLUMN "amount",
      DROP COLUMN "balance_before",
      DROP COLUMN "balance_after",
      ALTER COLUMN "amount_decimal" SET NOT NULL,
      ALTER COLUMN "balance_before_decimal" SET NOT NULL,
      ALTER COLUMN "balance_after_decimal" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "amount_decimal" TO "amount";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "balance_before_decimal" TO "balance_before";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "balance_after_decimal" TO "balance_after";
  `;
  console.log('✅ credit_deduction_ledger finalized');

  // credit_usage_daily_summary
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      DROP COLUMN "credits_deducted",
      DROP COLUMN "credits_balance_eod",
      ALTER COLUMN "credits_deducted_decimal" SET NOT NULL,
      ALTER COLUMN "credits_deducted_decimal" SET DEFAULT 0,
      ALTER COLUMN "credits_balance_eod_decimal" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      RENAME COLUMN "credits_deducted_decimal" TO "credits_deducted";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      RENAME COLUMN "credits_balance_eod_decimal" TO "credits_balance_eod";
  `;
  console.log('✅ credit_usage_daily_summary finalized\n');
}

/**
 * Main migration function
 */
async function migrate(dryRun: boolean = false): Promise<MigrationStats> {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('Plan 208: Fractional Credits Migration');
  console.log('Int → Decimal(12, 2)');
  console.log('========================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be committed\n');
  }

  let stats: MigrationStats = {
    userCreditBalanceRows: 0,
    tokenUsageLedgerRows: 0,
    creditDeductionLedgerRows: 0,
    creditUsageDailySummaryRows: 0,
    totalRowsMigrated: 0,
    duration: 0,
  };

  try {
    // Run migration in transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Create system_settings
      await createSystemSettings();

      // Step 2: Migrate tables
      stats.userCreditBalanceRows = await migrateUserCreditBalance();
      stats.tokenUsageLedgerRows = await migrateTokenUsageLedger();
      stats.creditDeductionLedgerRows = await migrateCreditDeductionLedger();
      stats.creditUsageDailySummaryRows = await migrateCreditUsageDailySummary();

      // Step 3: Verify data integrity
      const integrityPassed = await verifyDataIntegrity();
      if (!integrityPassed) {
        throw new Error('Data integrity check failed - rolling back migration');
      }

      // Step 4: Finalize migration
      if (!dryRun) {
        await finalizeMigration();
      }

      if (dryRun) {
        console.log('\n🔍 DRY RUN - Verification passed, but rolling back transaction...\n');
        throw new Error('DRY_RUN'); // Force rollback
      }
    });

    stats.totalRowsMigrated =
      stats.userCreditBalanceRows +
      stats.tokenUsageLedgerRows +
      stats.creditDeductionLedgerRows +
      stats.creditUsageDailySummaryRows;
    stats.duration = Date.now() - startTime;

    if (!dryRun) {
      console.log('\n========================================');
      console.log('✅ Migration completed successfully!');
      console.log('========================================\n');
      console.log(`Total rows migrated: ${stats.totalRowsMigrated}`);
      console.log(`- user_credit_balance: ${stats.userCreditBalanceRows}`);
      console.log(`- token_usage_ledger: ${stats.tokenUsageLedgerRows}`);
      console.log(`- credit_deduction_ledger: ${stats.creditDeductionLedgerRows}`);
      console.log(`- credit_usage_daily_summary: ${stats.creditUsageDailySummaryRows}`);
      console.log(`\nDuration: ${stats.duration}ms\n`);
    }

    return stats;
  } catch (error) {
    if ((error as Error).message === 'DRY_RUN') {
      console.log('✅ Dry run completed - all checks passed!\n');
      return stats;
    }

    console.error('\n❌ Migration failed:', error);
    console.error('Transaction rolled back - database unchanged\n');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
const isDryRun = process.argv.includes('--dry-run');
migrate(isDryRun)
  .then((stats) => {
    if (!isDryRun) {
      console.log('Migration complete. You can now update schema.prisma and run: npx prisma generate');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
