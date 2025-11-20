#!/usr/bin/env ts-node
/**
 * Database Restore Script
 *
 * Restores PostgreSQL database from backup file.
 *
 * Usage:
 *   npm run db:restore                          # Interactive - select from list
 *   npm run db:restore -- --file backup.sql     # Restore specific file
 *   npm run db:restore -- --latest              # Restore latest backup
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   BACKUP_DIR - Custom backup directory (default: ./backups)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ============================================================================
// Configuration
// ============================================================================

interface RestoreConfig {
  databaseUrl: string;
  backupDir: string;
  backupFile?: string;
  useLatest: boolean;
}

const parseArgs = (): { file?: string; latest: boolean } => {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');

  return {
    file: fileIndex !== -1 ? args[fileIndex + 1] : undefined,
    latest: args.includes('--latest'),
  };
};

const getConfig = (): RestoreConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable not set');
    console.error('   Please create a .env file with DATABASE_URL=...');
    process.exit(1);
  }

  const args = parseArgs();

  return {
    databaseUrl,
    backupDir: process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'),
    backupFile: args.file,
    useLatest: args.latest,
  };
};

// ============================================================================
// Database Connection Parsing
// ============================================================================

interface DatabaseInfo {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

const parseDatabaseUrl = (url: string): DatabaseInfo => {
  const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);

  if (!match) {
    console.error('❌ ERROR: Invalid DATABASE_URL format');
    console.error('   Expected: postgresql://username:password@host:port/database');
    process.exit(1);
  }

  return {
    username: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  };
};

// ============================================================================
// Backup File Selection
// ============================================================================

const listBackupFiles = (backupDir: string): string[] => {
  if (!fs.existsSync(backupDir)) {
    console.error(`❌ ERROR: Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir);
  const backupFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'));

  if (backupFiles.length === 0) {
    console.error(`❌ ERROR: No backup files found in ${backupDir}`);
    process.exit(1);
  }

  // Sort by modification time (newest first)
  return backupFiles.sort((a, b) => {
    const statA = fs.statSync(path.join(backupDir, a));
    const statB = fs.statSync(path.join(backupDir, b));
    return statB.mtimeMs - statA.mtimeMs;
  });
};

const getLatestBackup = (backupDir: string): string => {
  const files = listBackupFiles(backupDir);
  return files[0];
};

const selectBackupInteractive = async (backupDir: string): Promise<string> => {
  const files = listBackupFiles(backupDir);

  console.log('');
  console.log('📦 Available Backups:');
  console.log('');

  files.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const date = stats.mtime.toLocaleString();

    console.log(`  ${index + 1}. ${file}`);
    console.log(`     Size: ${sizeMB} MB | Date: ${date}`);
    console.log('');
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter backup number to restore (or "q" to quit): ', (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'q') {
        console.log('❌ Restore cancelled by user');
        process.exit(0);
      }

      const index = parseInt(answer, 10) - 1;

      if (isNaN(index) || index < 0 || index >= files.length) {
        console.error('❌ Invalid selection');
        process.exit(1);
      }

      resolve(files[index]);
    });
  });
};

// ============================================================================
// Restore Operations
// ============================================================================

const confirmRestore = async (backupFile: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log('⚠️  WARNING: This will DROP ALL TABLES and restore from backup!');
  console.log(`   Backup file: ${backupFile}`);
  console.log('');

  return new Promise((resolve) => {
    rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
};

const restoreDatabase = (config: RestoreConfig, backupFile: string): void => {
  const dbInfo = parseDatabaseUrl(config.databaseUrl);
  const backupPath = path.join(config.backupDir, backupFile);

  console.log('');
  console.log('🔄 Restoring database from backup...');
  console.log(`   Database: ${dbInfo.database}`);
  console.log(`   Backup: ${backupFile}`);
  console.log('');

  try {
    const env = {
      ...process.env,
      PGPASSWORD: dbInfo.password,
    };

    // Drop existing database connections
    console.log('🔌 Terminating active connections...');
    const terminateCmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbInfo.database}' AND pid <> pg_backend_pid();"`;
    execSync(terminateCmd, { env, stdio: 'ignore' });

    // Drop and recreate database
    console.log('🗑️  Dropping database...');
    const dropCmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "DROP DATABASE IF EXISTS ${dbInfo.database};"`;
    execSync(dropCmd, { env, stdio: 'inherit' });

    console.log('📦 Creating fresh database...');
    const createCmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "CREATE DATABASE ${dbInfo.database};"`;
    execSync(createCmd, { env, stdio: 'inherit' });

    // Restore from backup
    console.log('📥 Restoring data from backup...');

    if (backupFile.endsWith('.gz')) {
      // Decompress and restore
      execSync(`gunzip -c "${backupPath}" | psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database}`, {
        env,
        stdio: ['ignore', 'pipe', 'inherit']
      });
    } else {
      // Direct restore
      execSync(`psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${dbInfo.database} < "${backupPath}"`, {
        env,
        stdio: ['ignore', 'pipe', 'inherit']
      });
    }

    console.log('');
    console.log('✅ Database restored successfully!');
    console.log('');
    console.log('ℹ️  Next steps:');
    console.log('   1. Regenerate Prisma Client: npm run prisma:generate');
    console.log('   2. Verify data: npm run prisma:studio');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Restore failed!');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    process.exit(1);
  }
};

// ============================================================================
// Main Execution
// ============================================================================

const main = async (): Promise<void> => {
  const config = getConfig();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                 DATABASE RESTORE UTILITY                      ');
  console.log('═══════════════════════════════════════════════════════════════');

  let backupFile: string;

  if (config.backupFile) {
    // Use specified file
    backupFile = config.backupFile;
    console.log(`📁 Using specified backup: ${backupFile}`);
  } else if (config.useLatest) {
    // Use latest backup
    backupFile = getLatestBackup(config.backupDir);
    console.log(`📁 Using latest backup: ${backupFile}`);
  } else {
    // Interactive selection
    backupFile = await selectBackupInteractive(config.backupDir);
  }

  // Verify file exists
  const backupPath = path.join(config.backupDir, backupFile);
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ ERROR: Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  // Confirm restore
  const confirmed = await confirmRestore(backupFile);

  if (!confirmed) {
    console.log('');
    console.log('❌ Restore cancelled by user');
    console.log('');
    process.exit(0);
  }

  // Perform restore
  restoreDatabase(config, backupFile);
};

// Execute
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
