/**
 * Diagnostic Script: User Credit Allocation Analysis
 *
 * Examines all users and their credit allocations to identify discrepancies
 * with Plan 189 specifications.
 *
 * Plan 189 Correct Values:
 * - Free: 200 credits/month
 * - Pro: 1,500 credits/month
 * - Pro+: 5,000 credits/month
 * - Pro Max: 25,000 credits/month
 * - Enterprise Pro: 3,500 credits/month
 * - Enterprise Pro+: 11,000 credits/month
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Plan 189 correct credit allocations
const PLAN_189_CREDITS = {
  free: 200,
  pro: 1500,
  pro_plus: 5000,
  pro_max: 25000,
  enterprise_pro: 3500,
  enterprise_pro_plus: 11000,
  perpetual: 10000, // Legacy tier (if exists)
};

async function diagnoseUserCredits() {
  console.log('\n📊 USER CREDIT ALLOCATION DIAGNOSTIC\n');
  console.log('=' .repeat(100));

  try {
    // Fetch all users with their subscriptions and credits
    const users = await prisma.users.findMany({
      include: {
        subscriptions: {
          orderBy: { created_at: 'desc' },
          take: 1, // Get most recent subscription
        },
        credits: {
          orderBy: { created_at: 'desc' },
          take: 1, // Get most recent credit record
        },
      },
    });

    console.log(`\nTotal users: ${users.length}\n`);

    const issues = [];
    const correct = [];

    for (const user of users) {
      const subscription = user.subscriptions[0];
      const credit = user.credits[0];

      if (!subscription) {
        console.log(`⚠️  User ${user.email} has no subscription`);
        continue;
      }

      const tier = subscription.tier;
      const currentCredits = credit ? credit.monthly_allocation : 0;
      const expectedCredits = PLAN_189_CREDITS[tier];

      const status = subscription.status;
      const creditBalance = credit ? credit.balance : 0;

      // Check if credits match Plan 189
      if (expectedCredits === undefined) {
        issues.push({
          email: user.email,
          tier,
          issue: 'Unknown tier (not in Plan 189)',
          current: currentCredits,
          expected: 'N/A',
          status,
          balance: creditBalance,
        });
      } else if (currentCredits !== expectedCredits) {
        issues.push({
          email: user.email,
          tier,
          issue: 'Incorrect credit allocation',
          current: currentCredits,
          expected: expectedCredits,
          status,
          balance: creditBalance,
        });
      } else {
        correct.push({
          email: user.email,
          tier,
          credits: currentCredits,
          status,
          balance: creditBalance,
        });
      }
    }

    // Display results
    console.log('\n🔴 ISSUES FOUND:\n');
    if (issues.length === 0) {
      console.log('  ✅ No issues found - all users have correct credit allocations!\n');
    } else {
      console.log(`  Found ${issues.length} user(s) with incorrect credit allocations:\n`);
      console.log('  EMAIL                          | TIER           | STATUS    | CURRENT | EXPECTED | BALANCE | ISSUE');
      console.log('  ' + '-'.repeat(95));

      issues.forEach(issue => {
        const email = issue.email.padEnd(30);
        const tier = issue.tier.padEnd(14);
        const status = issue.status.padEnd(9);
        const current = String(issue.current).padEnd(7);
        const expected = String(issue.expected).padEnd(8);
        const balance = String(issue.balance).padEnd(7);
        console.log(`  ${email} | ${tier} | ${status} | ${current} | ${expected} | ${balance} | ${issue.issue}`);
      });
      console.log('');
    }

    console.log('\n✅ CORRECT ALLOCATIONS:\n');
    if (correct.length > 0) {
      console.log(`  ${correct.length} user(s) with correct credit allocations:\n`);
      console.log('  EMAIL                          | TIER           | STATUS    | CREDITS | BALANCE');
      console.log('  ' + '-'.repeat(80));

      correct.forEach(item => {
        const email = item.email.padEnd(30);
        const tier = item.tier.padEnd(14);
        const status = item.status.padEnd(9);
        const credits = String(item.credits).padEnd(7);
        const balance = String(item.balance).padEnd(7);
        console.log(`  ${email} | ${tier} | ${status} | ${credits} | ${balance}`);
      });
      console.log('');
    }

    console.log('\n' + '='.repeat(100));
    console.log(`\n📈 SUMMARY: ${issues.length} issue(s), ${correct.length} correct\n`);

    if (issues.length > 0) {
      console.log('💡 Run fix-user-credits.js to correct these issues.\n');
    }

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseUserCredits();
