/**
 * Database Seed Script
 *
 * Populates the database with sample data for testing and development.
 * Run with: npm run seed or npx ts-node src/db/seed.ts
 *
 * This script:
 * - Creates sample download records
 * - Adds test feedback entries
 * - Creates diagnostic log entries
 * - Sets up initial app version
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (optional - comment out to preserve data)
  console.log('Clearing existing data...');
  await prisma.download.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.diagnostic.deleteMany();
  await prisma.appVersion.deleteMany();
  console.log('✓ Existing data cleared\n');

  // Seed Downloads
  console.log('Creating download records...');
  const downloads = await Promise.all([
    prisma.download.create({
      data: {
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'linux',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'windows',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
    prisma.download.create({
      data: {
        os: 'macos',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
        ipHash: 'hash_' + Math.random().toString(36).substring(7),
      },
    }),
  ]);
  console.log(`✓ Created ${downloads.length} download records\n`);

  // Seed Feedback
  console.log('Creating feedback entries...');
  const feedbacks = await Promise.all([
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Love the app! The AI rewriting feature is incredibly helpful for my daily writing tasks.',
        email: 'user1@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Great tool, but would love to see more customization options for the rewriting styles.',
        email: 'user2@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        message: 'Anonymous feedback: The interface is clean and intuitive. Keep up the good work!',
      },
    }),
    prisma.feedback.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        message: 'Found a bug with the clipboard integration on Linux. Submitted diagnostic logs.',
        email: 'user3@example.com',
      },
    }),
    prisma.feedback.create({
      data: {
        message: 'This has transformed my workflow! Thank you for creating such an amazing tool.',
        email: 'user4@example.com',
      },
    }),
  ]);
  console.log(`✓ Created ${feedbacks.length} feedback entries\n`);

  // Seed Diagnostics
  console.log('Creating diagnostic records...');
  const diagnostics = await Promise.all([
    prisma.diagnostic.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-001.log',
        fileSize: 15240, // ~15KB
      },
    }),
    prisma.diagnostic.create({
      data: {
        userId: 'user_' + Math.random().toString(36).substring(7),
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-002.log',
        fileSize: 28900, // ~29KB
      },
    }),
    prisma.diagnostic.create({
      data: {
        filePath: 's3://rephlo-diagnostics/2025-11/diagnostic-003.log',
        fileSize: 45120, // ~45KB
      },
    }),
  ]);
  console.log(`✓ Created ${diagnostics.length} diagnostic records\n`);

  // Seed App Versions
  console.log('Creating app version records...');
  const versions = await Promise.all([
    prisma.appVersion.create({
      data: {
        version: '1.0.0',
        releaseDate: new Date('2025-10-01'),
        downloadUrl: 'https://releases.rephlo.ai/v1.0.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.0.0 - Initial Release

## Features
- AI-powered text rewriting
- Cross-platform desktop app (Windows, macOS, Linux)
- Clipboard integration
- Multiple rewriting styles
- Local processing for privacy

## Known Issues
- None reported

## Installation
Download and run the installer for your platform.`,
        isLatest: false, // Old version
      },
    }),
    prisma.appVersion.create({
      data: {
        version: '1.1.0',
        releaseDate: new Date('2025-10-15'),
        downloadUrl: 'https://releases.rephlo.ai/v1.1.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.1.0

## New Features
- Dark mode support
- Enhanced clipboard integration
- Performance improvements

## Bug Fixes
- Fixed issue with special characters
- Improved stability on Linux

## Updates
- Updated AI model for better accuracy`,
        isLatest: false,
      },
    }),
    prisma.appVersion.create({
      data: {
        version: '1.2.0',
        releaseDate: new Date('2025-11-01'),
        downloadUrl: 'https://releases.rephlo.ai/v1.2.0/rephlo-setup.exe',
        changelog: `# Rephlo v1.2.0 - Latest Release

## New Features
- Custom rewriting styles
- Batch processing support
- Improved UI/UX
- Diagnostic logging
- Feedback submission from app

## Bug Fixes
- Fixed memory leak on long sessions
- Resolved clipboard issues on Windows
- Improved error handling

## Performance
- 40% faster processing
- Reduced memory footprint
- Optimized startup time`,
        isLatest: true, // Current latest version
      },
    }),
  ]);
  console.log(`✓ Created ${versions.length} app version records\n`);

  // Print summary
  console.log('📊 Seed Summary:');
  console.log(`   Downloads:   ${downloads.length} records`);
  console.log(`   Feedbacks:   ${feedbacks.length} records`);
  console.log(`   Diagnostics: ${diagnostics.length} records`);
  console.log(`   Versions:    ${versions.length} records`);
  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
