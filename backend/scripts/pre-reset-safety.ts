#!/usr/bin/env ts-node
/**
 * Pre-Reset Safety Script
 *
 * Runs before destructive database operations (db:reset, migrate reset).
 * - Creates automatic backup
 * - Prompts for confirmation
 * - Warns about data loss
 *
 * This script is automatically called by npm run db:reset
 *
 * Environment Variables:
 *   SKIP_BACKUP_PROMPT - Set to 'true' to skip confirmation (CI/CD only)
 */

import { execSync } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// ============================================================================
// Configuration
// ============================================================================

const SKIP_PROMPT = process.env.SKIP_BACKUP_PROMPT === 'true';

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
// Backup Execution
// ============================================================================

const createBackup = (): void => {
  console.log('');
  console.log('📦 Creating automatic backup before reset...');
  console.log('');

  try {
    // Run backup script in auto mode with compression
    const backupScriptPath = path.join(__dirname, 'db-backup.ts');
    execSync(`npx ts-node "${backupScriptPath}" --auto --compress`, {
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    console.error('');
    console.error('❌ Backup failed! Cannot proceed with reset.');
    console.error('   Fix backup issues before running db:reset');
    console.error('');
    process.exit(1);
  }
};

// ============================================================================
// Warning Display
// ============================================================================

const displayWarning = (): void => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      ⚠️  DANGER ZONE  ⚠️                       ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  You are about to run: npm run db:reset');
  console.log('');
  console.log('  This will:');
  console.log('    1. ❌ DROP ALL TABLES (delete everything)');
  console.log('    2. 🔄 Recreate schema from migrations');
  console.log('    3. 🌱 Run seed script (creates 3 test users only)');
  console.log('');
  console.log('  ⚠️  ALL USER DATA WILL BE PERMANENTLY DELETED!');
  console.log('');
  console.log('  Backup will be created automatically in: ./backups/');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
};

// ============================================================================
// Main Execution
// ============================================================================

const main = async (): Promise<void> => {
  // Display warning
  displayWarning();

  // Skip prompt in CI/CD or if explicitly set
  if (SKIP_PROMPT) {
    console.log('⚠️  SKIP_BACKUP_PROMPT=true, proceeding without confirmation...');
    createBackup();
    console.log('✅ Pre-reset safety checks complete. Proceeding with reset...');
    console.log('');
    return;
  }

  // Ask for confirmation
  const confirmed = await askForConfirmation('⚠️  Do you want to proceed with database reset?');

  if (!confirmed) {
    console.log('');
    console.log('❌ Database reset cancelled by user');
    console.log('   Your data is safe! 🎉');
    console.log('');
    process.exit(1); // Exit with error to stop db:reset
  }

  // Create backup
  createBackup();

  // Final confirmation
  console.log('');
  console.log('✅ Backup created successfully!');
  console.log('✅ Pre-reset safety checks complete.');
  console.log('🔄 Proceeding with database reset...');
  console.log('');
};

// Execute
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
