require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Get table structure
    console.log('\nTable structure of _prisma_migrations:');
    const structureResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '_prisma_migrations'
      ORDER BY ordinal_position
    `);
    console.table(structureResult.rows);

    // Get all data
    console.log('\nAll migration records:');
    const dataResult = await client.query(`SELECT * FROM "_prisma_migrations" ORDER BY "id"`);
    console.table(dataResult.rows);

    client.release();
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

check();
