require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function recordMigration() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Read the migration file
    const fs = require('fs');
    const migrationContent = fs.readFileSync(
      'prisma/migrations/20251109130000_add_mfa_fields_to_user/migration.sql',
      'utf-8'
    );

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(migrationContent).digest('hex');

    // Record the migration
    console.log('\nRecording MFA migration in database...');
    const result = await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, started_at, applied_steps_count)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1)
       ON CONFLICT DO NOTHING`,
      [checksum, '20251109130000_add_mfa_fields_to_user', new Date(), new Date()]
    );
    console.log('Migration recorded successfully');

    // Verify it was recorded
    const verification = await client.query(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name LIKE '202511%' ORDER BY migration_name`
    );
    console.log('\nApplied migrations:');
    console.table(verification.rows);

    client.release();
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

recordMigration();
