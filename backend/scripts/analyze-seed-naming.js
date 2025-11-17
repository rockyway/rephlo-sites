#!/usr/bin/env node

/**
 * Seed Data Naming Convention Analyzer
 *
 * Analyzes the Prisma seed file to detect any remaining camelCase field names
 * that should be snake_case according to the Prisma schema.
 *
 * Usage: node scripts/analyze-seed-naming.js
 */

const fs = require('fs');
const path = require('path');

// Known snake_case fields from Prisma schema
const KNOWN_SNAKE_CASE_FIELDS = [
  'user_id',
  'role_id',
  'first_name',
  'last_name',
  'email_verified',
  'created_at',
  'updated_at',
  'credit_balance',
  'used_credits',
  'total_credits',
  'monthly_allocation',
  'credit_type',
  'billing_period_start',
  'billing_period_end',
  'is_current',
  'reset_day_of_month',
  'provider_id',
  'model_id',
  'scope_type',
  'subscription_tier',
  'margin_multiplier',
  'target_gross_margin_percent',
  'effective_from',
  'reason_details',
  'created_by',
  'requires_approval',
  'approval_status',
  'is_active',
  'assigned_by',
  'assigned_at',
  'user_id_role_id',
  'billing_cycle',
  'base_price_usd',
  'monthly_credit_allocation',
  'current_period_start',
  'current_period_end',
  'app_version',
  'download_count',
  'feedback_text',
  'is_resolved',
  'resolved_at',
  'resolved_by'
];

// Possible camelCase equivalents (for detection)
const CAMEL_CASE_PATTERNS = [
  { snake: 'user_id', camel: 'userId' },
  { snake: 'role_id', camel: 'roleId' },
  { snake: 'first_name', camel: 'firstName' },
  { snake: 'last_name', camel: 'lastName' },
  { snake: 'email_verified', camel: 'emailVerified' },
  { snake: 'created_at', camel: 'createdAt' },
  { snake: 'updated_at', camel: 'updatedAt' },
  { snake: 'credit_balance', camel: 'creditBalance' },
  { snake: 'used_credits', camel: 'usedCredits' },
  { snake: 'total_credits', camel: 'totalCredits' },
  { snake: 'monthly_allocation', camel: 'monthlyAllocation' },
  { snake: 'credit_type', camel: 'creditType' },
  { snake: 'billing_period_start', camel: 'billingPeriodStart' },
  { snake: 'billing_period_end', camel: 'billingPeriodEnd' },
  { snake: 'is_current', camel: 'isCurrent' },
  { snake: 'reset_day_of_month', camel: 'resetDayOfMonth' },
  { snake: 'provider_id', camel: 'providerId' },
  { snake: 'model_id', camel: 'modelId' },
  { snake: 'scope_type', camel: 'scopeType' },
  { snake: 'subscription_tier', camel: 'subscriptionTier' },
  { snake: 'margin_multiplier', camel: 'marginMultiplier' },
  { snake: 'target_gross_margin_percent', camel: 'targetGrossMarginPercent' },
  { snake: 'effective_from', camel: 'effectiveFrom' },
  { snake: 'reason_details', camel: 'reasonDetails' },
  { snake: 'created_by', camel: 'createdBy' },
  { snake: 'requires_approval', camel: 'requiresApproval' },
  { snake: 'approval_status', camel: 'approvalStatus' },
  { snake: 'is_active', camel: 'isActive' },
  { snake: 'assigned_by', camel: 'assignedBy' },
  { snake: 'assigned_at', camel: 'assignedAt' },
  { snake: 'user_id_role_id', camel: 'userId_roleId' },
  { snake: 'billing_cycle', camel: 'billingCycle' },
  { snake: 'base_price_usd', camel: 'basePriceUsd' },
  { snake: 'monthly_credit_allocation', camel: 'monthlyCreditAllocation' },
  { snake: 'current_period_start', camel: 'currentPeriodStart' },
  { snake: 'current_period_end', camel: 'currentPeriodEnd' },
  { snake: 'app_version', camel: 'appVersion' },
  { snake: 'download_count', camel: 'downloadCount' },
  { snake: 'feedback_text', camel: 'feedbackText' },
  { snake: 'is_resolved', camel: 'isResolved' },
  { snake: 'resolved_at', camel: 'resolvedAt' },
  { snake: 'resolved_by', camel: 'resolvedBy' }
];

// Analyze seed file
function analyzeSeedFile() {
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed.ts');

  console.log('🔍 Analyzing seed file for camelCase field names...\n');
  console.log(`File: ${seedPath}\n`);

  if (!fs.existsSync(seedPath)) {
    console.error('❌ Error: seed.ts not found at', seedPath);
    process.exit(1);
  }

  const content = fs.readFileSync(seedPath, 'utf-8');
  const lines = content.split('\n');

  const issues = [];

  // Check each line for camelCase patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip comments and imports
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('import')) {
      return;
    }

    // Check for each known camelCase pattern
    CAMEL_CASE_PATTERNS.forEach(({ snake, camel }) => {
      // Look for "fieldName:" pattern (object property)
      const propertyPattern = new RegExp(`\\b${camel}\\s*:`, 'g');
      // Look for "{ fieldName }" pattern (destructuring)
      const destructurePattern = new RegExp(`\\{[^}]*\\b${camel}\\b[^}]*\\}`, 'g');
      // Look for ".fieldName" pattern (object access)
      const accessPattern = new RegExp(`\\.${camel}\\b`, 'g');

      if (propertyPattern.test(line) || destructurePattern.test(line) || accessPattern.test(line)) {
        // Check if it's in a prisma operation context
        const contextStart = Math.max(0, index - 5);
        const contextEnd = Math.min(lines.length, index + 2);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        // Only flag if it appears to be in a Prisma data object
        if (context.includes('prisma.') && (context.includes('create') || context.includes('upsert') || context.includes('update') || context.includes('where'))) {
          issues.push({
            line: lineNum,
            camelCase: camel,
            snakeCase: snake,
            content: line.trim()
          });
        }
      }
    });
  });

  // Report results
  if (issues.length === 0) {
    console.log('✅ No camelCase field names found in seed file!');
    console.log('✅ All Prisma operations use snake_case as expected.\n');
    return true;
  } else {
    console.log(`❌ Found ${issues.length} potential camelCase field name(s):\n`);

    // Group by field name
    const grouped = issues.reduce((acc, issue) => {
      if (!acc[issue.camelCase]) {
        acc[issue.camelCase] = [];
      }
      acc[issue.camelCase].push(issue);
      return acc;
    }, {});

    Object.keys(grouped).sort().forEach(camelField => {
      const occurrences = grouped[camelField];
      const snakeField = occurrences[0].snakeCase;

      console.log(`\n📍 ${camelField} → should be ${snakeField}`);
      console.log(`   Found ${occurrences.length} occurrence(s):`);

      occurrences.forEach(({ line, content }) => {
        console.log(`   Line ${line}: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`);
      });
    });

    console.log('\n');
    console.log('💡 Recommendation:');
    console.log('   1. Review each occurrence to confirm it\'s a Prisma field');
    console.log('   2. Replace camelCase with snake_case equivalents');
    console.log('   3. Re-run this script to verify fixes\n');

    return false;
  }
}

// Additional: Check for generic camelCase patterns in data objects
function findGenericCamelCase() {
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed.ts');
  const content = fs.readFileSync(seedPath, 'utf-8');
  const lines = content.split('\n');

  const suspiciousLines = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip comments, imports, and variable declarations
    if (line.trim().startsWith('//') ||
        line.trim().startsWith('*') ||
        line.trim().startsWith('import') ||
        line.trim().startsWith('const ') ||
        line.trim().startsWith('let ') ||
        line.trim().startsWith('function')) {
      return;
    }

    // Look for pattern: "someFieldName:" where field has at least one uppercase letter in the middle
    const camelCaseFieldPattern = /(\w+[A-Z]\w+)\s*:/g;
    const matches = line.matchAll(camelCaseFieldPattern);

    for (const match of matches) {
      const fieldName = match[1];

      // Exclude known safe patterns (functions, React components, etc.)
      if (fieldName === 'PersonaDetails' ||
          fieldName === 'OAuth' ||
          fieldName === 'RBAC' ||
          fieldName === 'LLM' ||
          fieldName.startsWith('seed') ||
          fieldName.endsWith('Details') ||
          fieldName.endsWith('Summary')) {
        continue;
      }

      // Check if it's in a Prisma context
      const contextStart = Math.max(0, index - 5);
      const contextEnd = Math.min(lines.length, index + 2);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      if (context.includes('prisma.') && (context.includes('data:') || context.includes('where:'))) {
        suspiciousLines.push({
          line: lineNum,
          field: fieldName,
          content: line.trim()
        });
      }
    }
  });

  if (suspiciousLines.length > 0) {
    console.log('\n⚠️  Additional suspicious camelCase patterns found:\n');
    suspiciousLines.forEach(({ line, field, content }) => {
      console.log(`Line ${line}: ${field}`);
      console.log(`  ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n`);
    });
  }
}

// Run analysis
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Prisma Seed File - Naming Convention Analyzer');
console.log('═══════════════════════════════════════════════════════════════\n');

const isPassed = analyzeSeedFile();
findGenericCamelCase();

console.log('═══════════════════════════════════════════════════════════════\n');

process.exit(isPassed ? 0 : 1);
