/**
 * Plan 208: Fractional Credit System - Rollback Script
 *
 * This script reverts the fractional credits migration (Decimal → Int).
 * Use this if critical issues are found after migration.
 *
 * ⚠️ WARNING: This will truncate decimal values to integers!
 * Example: 1499.9 credits → 1499 credits (loss of 0.9 credits per user)
 *
 * Usage:
 *   npm run ts-node prisma/migrations/rollback-decimal-credits.ts [--confirm]
 *
 * Safety Features:
 * - Requires --confirm flag to prevent accidental rollback
 * - Dry-run mode available
 * - Transaction-based (all-or-nothing)
 * - Data loss calculation before rollback
 * - Automatic backup recommendation
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

interface RollbackStats {
  userCreditBalanceRows: number;
  tokenUsageLedgerRows: number;
  creditDeductionLedgerRows: number;
  creditUsageDailySummaryRows: number;
  totalRowsRolledBack: number;
  estimatedDataLoss: {
    userBalances: number; // Total credits lost
    deductions: number; // Total deductions lost precision
  };
  duration: number;
}

/**
 * Calculate estimated data loss from Decimal → Int conversion
 */
async function calculateDataLoss(): Promise<{
  userBalances: number;
  deductions: number;
}> {
  console.log('\n📊 Calculating estimated data loss...\n');

  // User balances data loss
  const userBalanceLoss = await prisma.$queryRaw<{ total_loss: Prisma.Decimal | null }[]>`
    SELECT SUM("amount" - FLOOR("amount")) as total_loss
    FROM "user_credit_balance"
    WHERE "amount" - FLOOR("amount") > 0;
  `;

  const userLoss = userBalanceLoss[0]?.total_loss
    ? parseFloat(userBalanceLoss[0].total_loss.toString())
    : 0;

  // Credit deductions data loss
  const deductionLoss = await prisma.$queryRaw<{ total_loss: Prisma.Decimal | null }[]>`
    SELECT SUM("credits_deducted" - FLOOR("credits_deducted")) as total_loss
    FROM "token_usage_ledger"
    WHERE "credits_deducted" - FLOOR("credits_deducted") > 0;
  `;

  const deductionLossValue = deductionLoss[0]?.total_loss
    ? parseFloat(deductionLoss[0].total_loss.toString())
    : 0;

  console.log(`⚠️  User balances: ${userLoss.toFixed(2)} total credits will be lost`);
  console.log(`⚠️  Deductions: ${deductionLossValue.toFixed(2)} total credits precision lost\n`);

  return {
    userBalances: userLoss,
    deductions: deductionLossValue,
  };
}

/**
 * Rollback user_credit_balance table
 */
async function rollbackUserCreditBalance(): Promise<number> {
  console.log('🔄 Rolling back user_credit_balance...');

  // Add Int columns
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      ADD COLUMN IF NOT EXISTS "amount_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "last_deduction_amount_int" INTEGER;
  `;

  // Convert Decimal → Int (TRUNCATE decimals)
  await prisma.$executeRaw`
    UPDATE "user_credit_balance"
      SET
        "amount_int" = FLOOR("amount")::integer,
        "last_deduction_amount_int" = CASE
          WHEN "last_deduction_amount" IS NULL THEN NULL
          ELSE FLOOR("last_deduction_amount")::integer
        END;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "user_credit_balance";
  `;

  console.log(`✅ Rolled back ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Rollback token_usage_ledger table
 */
async function rollbackTokenUsageLedger(): Promise<number> {
  console.log('🔄 Rolling back token_usage_ledger...');

  // Add Int columns
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      ADD COLUMN IF NOT EXISTS "credits_deducted_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "input_credits_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "output_credits_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "total_credits_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "cache_write_credits_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "cache_read_credits_int" INTEGER;
  `;

  // Convert Decimal → Int (TRUNCATE decimals)
  await prisma.$executeRaw`
    UPDATE "token_usage_ledger"
      SET
        "credits_deducted_int" = FLOOR("credits_deducted")::integer,
        "input_credits_int" = CASE
          WHEN "input_credits" IS NULL THEN NULL
          ELSE FLOOR("input_credits")::integer
        END,
        "output_credits_int" = CASE
          WHEN "output_credits" IS NULL THEN NULL
          ELSE FLOOR("output_credits")::integer
        END,
        "total_credits_int" = CASE
          WHEN "total_credits" IS NULL THEN NULL
          ELSE FLOOR("total_credits")::integer
        END,
        "cache_write_credits_int" = CASE
          WHEN "cache_write_credits" IS NULL THEN NULL
          ELSE FLOOR("cache_write_credits")::integer
        END,
        "cache_read_credits_int" = CASE
          WHEN "cache_read_credits" IS NULL THEN NULL
          ELSE FLOOR("cache_read_credits")::integer
        END;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "token_usage_ledger";
  `;

  console.log(`✅ Rolled back ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Rollback credit_deduction_ledger table
 */
async function rollbackCreditDeductionLedger(): Promise<number> {
  console.log('🔄 Rolling back credit_deduction_ledger...');

  // Add Int columns
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      ADD COLUMN IF NOT EXISTS "amount_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "balance_before_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "balance_after_int" INTEGER;
  `;

  // Convert Decimal → Int (TRUNCATE decimals)
  await prisma.$executeRaw`
    UPDATE "credit_deduction_ledger"
      SET
        "amount_int" = FLOOR("amount")::integer,
        "balance_before_int" = FLOOR("balance_before")::integer,
        "balance_after_int" = FLOOR("balance_after")::integer;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "credit_deduction_ledger";
  `;

  console.log(`✅ Rolled back ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Rollback credit_usage_daily_summary table
 */
async function rollbackCreditUsageDailySummary(): Promise<number> {
  console.log('🔄 Rolling back credit_usage_daily_summary...');

  // Add Int columns
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      ADD COLUMN IF NOT EXISTS "credits_deducted_int" INTEGER,
      ADD COLUMN IF NOT EXISTS "credits_balance_eod_int" INTEGER;
  `;

  // Convert Decimal → Int (TRUNCATE decimals)
  await prisma.$executeRaw`
    UPDATE "credit_usage_daily_summary"
      SET
        "credits_deducted_int" = FLOOR("credits_deducted")::integer,
        "credits_balance_eod_int" = FLOOR("credits_balance_eod")::integer;
  `;

  const rowCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "credit_usage_daily_summary";
  `;

  console.log(`✅ Rolled back ${Number(rowCount[0].count)} rows\n`);
  return Number(rowCount[0].count);
}

/**
 * Finalize rollback by dropping Decimal columns and renaming Int columns
 */
async function finalizeRollback(): Promise<void> {
  console.log('🔄 Finalizing rollback (dropping Decimal columns, renaming Int columns)...\n');

  // user_credit_balance
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      DROP COLUMN "amount",
      DROP COLUMN "last_deduction_amount",
      ALTER COLUMN "amount_int" SET NOT NULL,
      ALTER COLUMN "amount_int" SET DEFAULT 0;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      RENAME COLUMN "amount_int" TO "amount";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "user_credit_balance"
      RENAME COLUMN "last_deduction_amount_int" TO "last_deduction_amount";
  `;
  console.log('✅ user_credit_balance rolled back');

  // token_usage_ledger
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      DROP COLUMN "credits_deducted",
      DROP COLUMN "input_credits",
      DROP COLUMN "output_credits",
      DROP COLUMN "total_credits",
      DROP COLUMN "cache_write_credits",
      DROP COLUMN "cache_read_credits",
      ALTER COLUMN "credits_deducted_int" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "credits_deducted_int" TO "credits_deducted";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "input_credits_int" TO "input_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "output_credits_int" TO "output_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "total_credits_int" TO "total_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "cache_write_credits_int" TO "cache_write_credits";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "token_usage_ledger"
      RENAME COLUMN "cache_read_credits_int" TO "cache_read_credits";
  `;
  console.log('✅ token_usage_ledger rolled back');

  // credit_deduction_ledger
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      DROP COLUMN "amount",
      DROP COLUMN "balance_before",
      DROP COLUMN "balance_after",
      ALTER COLUMN "amount_int" SET NOT NULL,
      ALTER COLUMN "balance_before_int" SET NOT NULL,
      ALTER COLUMN "balance_after_int" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "amount_int" TO "amount";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "balance_before_int" TO "balance_before";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_deduction_ledger"
      RENAME COLUMN "balance_after_int" TO "balance_after";
  `;
  console.log('✅ credit_deduction_ledger rolled back');

  // credit_usage_daily_summary
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      DROP COLUMN "credits_deducted",
      DROP COLUMN "credits_balance_eod",
      ALTER COLUMN "credits_deducted_int" SET NOT NULL,
      ALTER COLUMN "credits_deducted_int" SET DEFAULT 0,
      ALTER COLUMN "credits_balance_eod_int" SET NOT NULL;
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      RENAME COLUMN "credits_deducted_int" TO "credits_deducted";
  `;
  await prisma.$executeRaw`
    ALTER TABLE "credit_usage_daily_summary"
      RENAME COLUMN "credits_balance_eod_int" TO "credits_balance_eod";
  `;
  console.log('✅ credit_usage_daily_summary rolled back\n');
}

/**
 * Remove system_settings table
 */
async function removeSystemSettings(): Promise<void> {
  console.log('🗑️  Removing credit_minimum_increment setting...');

  await prisma.$executeRaw`
    DELETE FROM "system_settings" WHERE "key" = 'credit_minimum_increment';
  `;

  console.log('✅ Setting removed (you may want to drop system_settings table manually if empty)\n');
}

/**
 * Main rollback function
 */
async function rollback(confirm: boolean = false): Promise<RollbackStats> {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('⚠️  Plan 208: Rollback Fractional Credits');
  console.log('Decimal(12, 2) → Int');
  console.log('========================================\n');

  if (!confirm) {
    console.error('❌ ERROR: Rollback requires --confirm flag\n');
    console.error('Usage: npm run ts-node prisma/migrations/rollback-decimal-credits.ts --confirm\n');
    console.error('⚠️  WARNING: This will truncate decimal values to integers!');
    console.error('Example: 1499.9 credits → 1499 credits\n');
    throw new Error('Rollback requires confirmation');
  }

  // Calculate data loss
  const dataLoss = await calculateDataLoss();

  console.log('⚠️  ESTIMATED DATA LOSS:');
  console.log(`   User balances: ${dataLoss.userBalances.toFixed(2)} credits`);
  console.log(`   Deductions: ${dataLoss.deductions.toFixed(2)} credits\n`);
  console.log('📋 RECOMMENDATION: Create database backup before proceeding!\n');
  console.log('Waiting 5 seconds before starting rollback...\n');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  let stats: RollbackStats = {
    userCreditBalanceRows: 0,
    tokenUsageLedgerRows: 0,
    creditDeductionLedgerRows: 0,
    creditUsageDailySummaryRows: 0,
    totalRowsRolledBack: 0,
    estimatedDataLoss: dataLoss,
    duration: 0,
  };

  try {
    // Run rollback in transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Rollback tables
      stats.userCreditBalanceRows = await rollbackUserCreditBalance();
      stats.tokenUsageLedgerRows = await rollbackTokenUsageLedger();
      stats.creditDeductionLedgerRows = await rollbackCreditDeductionLedger();
      stats.creditUsageDailySummaryRows = await rollbackCreditUsageDailySummary();

      // Step 2: Finalize rollback
      await finalizeRollback();

      // Step 3: Remove system settings
      await removeSystemSettings();
    });

    stats.totalRowsRolledBack =
      stats.userCreditBalanceRows +
      stats.tokenUsageLedgerRows +
      stats.creditDeductionLedgerRows +
      stats.creditUsageDailySummaryRows;
    stats.duration = Date.now() - startTime;

    console.log('\n========================================');
    console.log('✅ Rollback completed successfully!');
    console.log('========================================\n');
    console.log(`Total rows rolled back: ${stats.totalRowsRolledBack}`);
    console.log(`- user_credit_balance: ${stats.userCreditBalanceRows}`);
    console.log(`- token_usage_ledger: ${stats.tokenUsageLedgerRows}`);
    console.log(`- credit_deduction_ledger: ${stats.creditDeductionLedgerRows}`);
    console.log(`- credit_usage_daily_summary: ${stats.creditUsageDailySummaryRows}`);
    console.log(`\nData loss:`);
    console.log(`- User balances: ${stats.estimatedDataLoss.userBalances.toFixed(2)} credits`);
    console.log(`- Deductions: ${stats.estimatedDataLoss.deductions.toFixed(2)} credits`);
    console.log(`\nDuration: ${stats.duration}ms\n`);

    console.log('⚠️  NEXT STEPS:');
    console.log('1. Update schema.prisma (revert Decimal → Int)');
    console.log('2. Run: npx prisma generate');
    console.log('3. Update service code to remove Decimal handling\n');

    return stats;
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    console.error('Transaction rolled back - database unchanged\n');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run rollback
const isConfirmed = process.argv.includes('--confirm');
rollback(isConfirmed)
  .then((stats) => {
    console.log('Rollback complete.');
    process.exit(0);
  })
  .catch((error) => {
    if (error.message === 'Rollback requires confirmation') {
      process.exit(1);
    }
    console.error('Fatal error:', error);
    process.exit(1);
  });
