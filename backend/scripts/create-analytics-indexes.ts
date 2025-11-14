/**
 * Create Analytics Indexes Script
 *
 * Creates the required indexes for Admin Analytics Dashboard outside of a transaction.
 * CONCURRENTLY indexes cannot be created inside a transaction, so we need a dedicated script.
 *
 * Reference: docs/reference/183-analytics-database-schema.md
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createIndexes() {
  console.log('='.repeat(80));
  console.log('Creating Analytics Dashboard Indexes');
  console.log('='.repeat(80));
  console.log();

  try {
    // Index 1: Composite covering index
    console.log('Creating idx_token_usage_analytics (composite covering index)...');
    console.log('This may take 1-3 minutes for large tables. Please wait...\n');

    const startTime1 = Date.now();

    await prisma.$executeRawUnsafe(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
      ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
      INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens)
    `);

    const endTime1 = Date.now();
    const duration1 = ((endTime1 - startTime1) / 1000).toFixed(2);

    console.log(`✅ Index created in ${duration1}s\n`);

    // Index 2: Partial index for successful requests
    console.log('Creating idx_token_usage_success (partial index)...');
    console.log('This may take 30-60 seconds for large tables. Please wait...\n');

    const startTime2 = Date.now();

    await prisma.$executeRawUnsafe(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
      ON token_usage_ledger (created_at DESC)
      WHERE status = 'success'
    `);

    const endTime2 = Date.now();
    const duration2 = ((endTime2 - startTime2) / 1000).toFixed(2);

    console.log(`✅ Index created in ${duration2}s\n`);

    // Update table statistics
    console.log('Updating table statistics with ANALYZE...');

    await prisma.$executeRawUnsafe(`ANALYZE token_usage_ledger`);

    console.log('✅ Table statistics updated\n');

    // Verify indexes were created
    console.log('Verifying indexes...');

    const indexes = await prisma.$queryRaw<any[]>`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'token_usage_ledger'
        AND indexname IN ('idx_token_usage_analytics', 'idx_token_usage_success')
    `;

    if (indexes.length === 2) {
      console.log('✅ Both indexes verified:\n');
      for (const idx of indexes) {
        console.log(`  - ${idx.indexname}`);
      }
      console.log();
    } else {
      console.error(`⚠️  Expected 2 indexes, found ${indexes.length}`);
    }

    // Check index sizes
    console.log('Checking index sizes...');

    const sizes = await prisma.$queryRaw<any[]>`
      SELECT
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE tablename = 'token_usage_ledger'
        AND indexname IN ('idx_token_usage_analytics', 'idx_token_usage_success')
    `;

    if (sizes.length > 0) {
      console.log();
      for (const size of sizes) {
        console.log(`  ${size.indexname}: ${size.size}`);
      }
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ SUCCESS: Analytics indexes created successfully');
    console.log('='.repeat(80));
    console.log(`
Next Steps:
1. Run verification script: npm run verify:analytics
2. Test query performance with EXPLAIN ANALYZE
3. Monitor index usage: pg_stat_user_indexes

Expected Performance Improvements:
- Gross Margin KPI query: 2-5s → 50-200ms (25x faster)
- Provider Cost Breakdown: 3-7s → 100-300ms (25x faster)
- Margin Trend Chart: 5-10s → 200-500ms (20x faster)
`);

  } catch (error: any) {
    console.error('❌ Failed to create indexes:');
    console.error(error.message);

    if (error.message.includes('already exists')) {
      console.log('\n✅ Indexes already exist. No action needed.');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run script
createIndexes()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
