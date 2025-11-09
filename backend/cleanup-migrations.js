require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Check current migrations
    console.log('\nCurrent migrations in database:');
    const result = await client.query(
      `SELECT id, migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY id`
    );
    console.table(result.rows);

    // Delete old migration records
    console.log('\nDeleting old migration records...');
    const deleteResult = await client.query(
      `DELETE FROM "_prisma_migrations"
       WHERE migration_name LIKE '20251109000001%'
          OR migration_name LIKE '20251109000002%'
          OR migration_name LIKE '20251109071433%'`
    );
    console.log(`Deleted ${deleteResult.rowCount} old migration records`);

    // Show remaining migrations
    console.log('\nRemaining migrations in database:');
    const finalResult = await client.query(
      `SELECT id, migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY id`
    );
    console.table(finalResult.rows);

    client.release();
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    pool.end();
    process.exit(1);
  }
}

cleanup();
