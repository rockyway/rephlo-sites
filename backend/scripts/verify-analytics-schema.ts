/**
 * Analytics Database Schema Verification Script
 *
 * Verifies that the token_usage_ledger table is ready for Admin Analytics Dashboard:
 * 1. Table schema matches requirements
 * 2. Required indexes exist
 * 3. Sample data availability
 * 4. Query performance benchmarks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SchemaColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function verifySchema() {
  console.log('='.repeat(80));
  console.log('Analytics Database Schema Verification Report');
  console.log('='.repeat(80));
  console.log();

  try {
    // Task 1: Verify token_usage_ledger table schema
    console.log('Task 1: Verifying token_usage_ledger Table Schema');
    console.log('-'.repeat(80));

    const columns = await prisma.$queryRaw<SchemaColumn[]>`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'token_usage_ledger'
      ORDER BY ordinal_position
    `;

    if (columns.length === 0) {
      console.error('❌ FAILED: token_usage_ledger table does not exist!');
      return;
    }

    console.log(`✅ Table exists with ${columns.length} columns\n`);

    // Check required fields for analytics
    const requiredFields = [
      { name: 'id', type: 'uuid' },
      { name: 'request_id', type: 'uuid' },
      { name: 'user_id', type: 'uuid' },
      { name: 'model_id', type: 'character varying' },
      { name: 'provider_id', type: 'uuid' },
      { name: 'vendor_cost', type: 'numeric' },
      { name: 'credits_deducted', type: 'integer' },
      { name: 'margin_multiplier', type: 'numeric' },
      { name: 'gross_margin_usd', type: 'numeric' },
      { name: 'status', type: 'request_status' },
      { name: 'created_at', type: 'timestamp without time zone' },
      { name: 'input_tokens', type: 'integer' },
      { name: 'output_tokens', type: 'integer' },
    ];

    let missingFields = 0;
    let typeErrors = 0;

    for (const field of requiredFields) {
      const column = columns.find(c => c.column_name === field.name);
      if (!column) {
        console.error(`❌ Missing required field: ${field.name}`);
        missingFields++;
      } else if (!column.data_type.includes(field.type.split(' ')[0])) {
        console.error(`⚠️  Type mismatch: ${field.name} (expected ${field.type}, got ${column.data_type})`);
        typeErrors++;
      }
    }

    if (missingFields === 0 && typeErrors === 0) {
      console.log('✅ All required fields present with correct types\n');
    } else {
      console.log(`\n❌ Schema verification failed: ${missingFields} missing fields, ${typeErrors} type errors\n`);
    }

    // Display all columns
    console.log('Table Schema:');
    console.table(columns.map(c => ({
      Column: c.column_name,
      Type: c.data_type,
      Nullable: c.is_nullable,
      Default: c.column_default || 'NULL',
    })));

    // Task 2: Verify database indexes
    console.log('\nTask 2: Verifying Database Indexes');
    console.log('-'.repeat(80));

    const indexes = await prisma.$queryRaw<IndexInfo[]>`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'token_usage_ledger'
      ORDER BY indexname
    `;

    console.log(`Found ${indexes.length} indexes:\n`);

    for (const idx of indexes) {
      console.log(`Index: ${idx.indexname}`);
      console.log(`  Definition: ${idx.indexdef}\n`);
    }

    // Check for required analytics indexes
    const requiredIndexes = [
      'idx_token_usage_analytics',
      'idx_token_usage_success',
    ];

    const missingIndexes: string[] = [];
    for (const reqIdx of requiredIndexes) {
      const exists = indexes.some(idx => idx.indexname === reqIdx);
      if (exists) {
        console.log(`✅ Required index exists: ${reqIdx}`);
      } else {
        console.log(`❌ Missing required index: ${reqIdx}`);
        missingIndexes.push(reqIdx);
      }
    }

    console.log();

    // Task 3: Verify data availability
    console.log('\nTask 3: Verifying Data Availability');
    console.log('-'.repeat(80));

    const rowCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM token_usage_ledger
    `;
    const rowCount = Number(rowCountResult[0].count);

    console.log(`Total rows: ${rowCount}`);

    if (rowCount === 0) {
      console.log('⚠️  No data in token_usage_ledger. Integration tests will seed data.\n');
    } else {
      console.log('✅ Sample data available\n');

      // Sample data analysis
      const sampleData = await prisma.$queryRaw<any[]>`
        SELECT
          status,
          COUNT(*) as count,
          SUM(gross_margin_usd) as total_margin,
          AVG(vendor_cost) as avg_cost
        FROM token_usage_ledger
        GROUP BY status
      `;

      console.log('Data breakdown by status:');
      console.table(sampleData.map(row => ({
        Status: row.status,
        Count: Number(row.count),
        'Total Margin (USD)': Number(row.total_margin || 0).toFixed(8),
        'Avg Cost (USD)': Number(row.avg_cost || 0).toFixed(8),
      })));
    }

    // Task 4: Test query performance
    console.log('\nTask 4: Query Performance Benchmark');
    console.log('-'.repeat(80));

    if (rowCount > 0) {
      // Sample aggregation query
      const startTime = Date.now();

      const result = await prisma.$queryRaw<any[]>`
        SELECT
          SUM(gross_margin_usd) as total_margin,
          SUM(vendor_cost) as total_cost,
          COUNT(*) as request_count,
          SUM(credits_deducted) as total_credits
        FROM token_usage_ledger
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND status = 'success'
      `;

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      console.log(`Query execution time: ${queryTime}ms`);
      console.log(`Result:`, result[0]);

      if (queryTime < 500) {
        console.log(`✅ Query performance: EXCELLENT (<500ms)`);
      } else if (queryTime < 1000) {
        console.log(`⚠️  Query performance: ACCEPTABLE (500-1000ms)`);
      } else {
        console.log(`❌ Query performance: POOR (>1000ms) - Consider adding indexes`);
      }

      // EXPLAIN ANALYZE for index usage verification
      console.log('\nQuery execution plan:');
      const explainResult = await prisma.$queryRawUnsafe<any[]>(`
        EXPLAIN ANALYZE
        SELECT
          SUM(gross_margin_usd) as total_margin,
          COUNT(*) as request_count
        FROM token_usage_ledger
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND status = 'success'
      `);

      explainResult.forEach(row => {
        console.log(row['QUERY PLAN']);
      });
    } else {
      console.log('⏭️  Skipping performance test (no data)');
    }

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    let status = '✅ READY';
    const issues: string[] = [];

    if (missingFields > 0 || typeErrors > 0) {
      status = '❌ NEEDS FIXES';
      issues.push(`Schema issues: ${missingFields} missing fields, ${typeErrors} type errors`);
    }

    if (missingIndexes.length > 0) {
      status = '❌ NEEDS FIXES';
      issues.push(`Missing indexes: ${missingIndexes.join(', ')}`);
    }

    console.log(`\nStatus: ${status}`);

    if (issues.length > 0) {
      console.log('\nIssues Found:');
      issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }

    console.log(`\nData Availability: ${rowCount > 0 ? '✅ Ready' : '⚠️  No data (will be seeded in tests)'}`);

    if (rowCount > 0) {
      console.log(`Query Performance: ${queryTime < 500 ? '✅ Excellent' : queryTime < 1000 ? '⚠️  Acceptable' : '❌ Poor'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Recommendations:');
    console.log('='.repeat(80));

    if (missingIndexes.includes('idx_token_usage_analytics')) {
      console.log(`
⚠️  CREATE REQUIRED INDEX: idx_token_usage_analytics

Run this migration to create the composite index:

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_analytics
ON token_usage_ledger (created_at DESC, status, provider_id, user_id)
INCLUDE (gross_margin_usd, vendor_cost, credits_deducted, input_tokens, output_tokens);

ANALYZE token_usage_ledger;
`);
    }

    if (missingIndexes.includes('idx_token_usage_success')) {
      console.log(`
⚠️  CREATE REQUIRED INDEX: idx_token_usage_success

Run this migration to create the partial index:

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_usage_success
ON token_usage_ledger (created_at DESC)
WHERE status = 'success';

ANALYZE token_usage_ledger;
`);
    }

    if (rowCount === 0) {
      console.log(`
ℹ️  No sample data found. To test with realistic data:
   1. Run integration tests: npm run test:integration
   2. Or seed test data: npm run seed
`);
    }

  } catch (error) {
    console.error('❌ Verification failed with error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifySchema()
  .then(() => {
    console.log('\n✅ Verification script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
