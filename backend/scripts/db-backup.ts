#!/usr/bin/env ts-node
/**
 * Database Backup Script
 *
 * Creates timestamped PostgreSQL backups using pg_dump.
 * Automatically runs before destructive operations (db:reset, migrate reset).
 *
 * Usage:
 *   npm run db:backup                    # Interactive backup
 *   npm run db:backup -- --auto          # Automatic backup (no prompts)
 *   npm run db:backup -- --compress      # Create compressed backup
 *
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   BACKUP_DIR - Custom backup directory (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// ============================================================================
// Configuration
// ============================================================================

interface BackupConfig {
  databaseUrl: string;
  backupDir: string;
  retentionDays: number;
  autoMode: boolean;
  compress: boolean;
}

const parseArgs = (): { auto: boolean; compress: boolean } => {
  const args = process.argv.slice(2);
  return {
    auto: args.includes('--auto'),
    compress: args.includes('--compress'),
  };
};

const getConfig = (): BackupConfig => {
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
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
    autoMode: args.auto,
    compress: args.compress,
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
  // Format: postgresql://username:password@host:port/database
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
// Backup Operations
// ============================================================================

const ensureBackupDirectory = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created backup directory: ${dir}`);
  }
};

const generateBackupFilename = (dbName: string, compress: boolean): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = compress ? 'sql.gz' : 'sql';
  return `${dbName}_${timestamp}.${extension}`;
};

const createBackup = (config: BackupConfig): string => {
  const dbInfo = parseDatabaseUrl(config.databaseUrl);
  const backupFilename = generateBackupFilename(dbInfo.database, config.compress);
  const backupPath = path.join(config.backupDir, backupFilename);

  console.log('');
  console.log('🔄 Creating database backup...');
  console.log(`   Database: ${dbInfo.database}`);
  console.log(`   Host: ${dbInfo.host}:${dbInfo.port}`);
  console.log(`   Backup file: ${backupFilename}`);
  console.log('');

  try {
    // Set environment variable for password (pg_dump reads PGPASSWORD)
    const env = {
      ...process.env,
      PGPASSWORD: dbInfo.password,
    };

    // Build pg_dump command
    const pgDumpCmd = [
      'pg_dump',
      `-h ${dbInfo.host}`,
      `-p ${dbInfo.port}`,
      `-U ${dbInfo.username}`,
      `-d ${dbInfo.database}`,
      '--no-password',
      '--verbose',
      '--format=plain',
      '--no-owner',
      '--no-acl',
    ].join(' ');

    // Execute backup (with optional compression)
    if (config.compress) {
      execSync(`${pgDumpCmd} | gzip > "${backupPath}"`, {
        env,
        stdio: ['ignore', 'pipe', 'inherit']
      });
    } else {
      execSync(`${pgDumpCmd} > "${backupPath}"`, {
        env,
        stdio: ['ignore', 'pipe', 'inherit']
      });
    }

    // Get backup file size
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('');
    console.log('✅ Backup completed successfully!');
    console.log(`   File: ${backupPath}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log('');

    return backupPath;

  } catch (error) {
    console.error('');
    console.error('❌ Backup failed!');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('');
    process.exit(1);
  }
};

// ============================================================================
// Cleanup Old Backups
// ============================================================================

const cleanupOldBackups = (config: BackupConfig): void => {
  const now = Date.now();
  const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(config.backupDir);
  const backupFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'));

  let deletedCount = 0;

  for (const file of backupFiles) {
    const filePath = path.join(config.backupDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > retentionMs) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️  Deleted old backup: ${file} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`);
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
    console.log('');
  }
};

// ============================================================================
// User Confirmation
// ============================================================================

const askForConfirmation = async (message: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// ============================================================================
// Main Execution
// ============================================================================

const main = async (): Promise<void> => {
  const config = getConfig();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  DATABASE BACKUP UTILITY                      ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Ensure backup directory exists
  ensureBackupDirectory(config.backupDir);

  // Ask for confirmation in interactive mode
  if (!config.autoMode) {
    const dbInfo = parseDatabaseUrl(config.databaseUrl);
    console.log(`📊 Database: ${dbInfo.database}`);
    console.log(`🗂️  Backup directory: ${config.backupDir}`);
    console.log(`🗜️  Compression: ${config.compress ? 'Enabled' : 'Disabled'}`);
    console.log('');

    const confirmed = await askForConfirmation('⚠️  Proceed with backup?');

    if (!confirmed) {
      console.log('❌ Backup cancelled by user');
      process.exit(0);
    }
  }

  // Create backup
  createBackup(config);

  // Cleanup old backups
  if (!config.autoMode) {
    console.log(`🧹 Checking for backups older than ${config.retentionDays} days...`);
    cleanupOldBackups(config);
  }

  console.log('✅ Backup process completed successfully!');
  console.log('');
};

// Execute
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
