/**
 * Check User Credit Balance Table
 *
 * This script examines the user_credit_balance table (the table that the API returns)
 * to identify discrepancies with Plan 189 credit allocations.
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
};

async function checkUserCreditBalance() {
  console.log('\n💰 USER CREDIT BALANCE TABLE ANALYSIS\n');
  console.log('='.repeat(120));

  try {
    // Fetch all users with their credit balances and subscriptions
    const users = await prisma.users.findMany({
      include: {
        user_credit_balance: true,
        subscription_monetization: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        credits: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    console.log(`\nTotal users: ${users.length}\n`);

    console.log('EMAIL                          | TIER           | BALANCE TABLE | CREDITS TABLE | EXPECTED | STATUS');
    console.log('-'.repeat(120));

    const issues = [];
    const correct = [];

    users.forEach(user => {
      const subscription = user.subscription_monetization[0];
      const creditRecord = user.credits[0];
      const balanceRecord = user.user_credit_balance;

      if (!subscription) {
        console.log(`${user.email.padEnd(30)} | ${'NO SUB'.padEnd(14)} | N/A           | N/A           | N/A      | ⚠️  No subscription`);
        return;
      }

      const tier = subscription.tier;
      const balanceAmount = balanceRecord ? balanceRecord.amount : 0;
      const creditTableAmount = creditRecord ? creditRecord.total_credits : 0;
      const expectedCredits = PLAN_189_CREDITS[tier];

      const email = user.email.padEnd(30);
      const tierStr = tier.padEnd(14);
      const balanceStr = String(balanceAmount).padEnd(13);
      const creditStr = String(creditTableAmount).padEnd(13);
      const expectedStr = String(expectedCredits || 'N/A').padEnd(8);

      // Check if balance table matches expected Plan 189 value
      if (expectedCredits === undefined) {
        console.log(`${email} | ${tierStr} | ${balanceStr} | ${creditStr} | ${expectedStr} | ⚠️  Unknown tier`);
        issues.push({
          email: user.email,
          tier,
          issue: 'Unknown tier (not in Plan 189)',
          balanceAmount,
          creditTableAmount,
          expected: 'N/A',
        });
      } else if (balanceAmount !== expectedCredits) {
        console.log(`${email} | ${tierStr} | ${balanceStr} | ${creditStr} | ${expectedStr} | ❌ MISMATCH`);
        issues.push({
          email: user.email,
          tier,
          issue: 'user_credit_balance.amount does not match Plan 189',
          balanceAmount,
          creditTableAmount,
          expected: expectedCredits,
        });
      } else {
        console.log(`${email} | ${tierStr} | ${balanceStr} | ${creditStr} | ${expectedStr} | ✅ Correct`);
        correct.push({
          email: user.email,
          tier,
          balanceAmount,
        });
      }
    });

    console.log('\n' + '='.repeat(120));

    // Summary
    console.log('\n📊 SUMMARY:\n');
    console.log(`  ✅ Correct: ${correct.length} user(s)`);
    console.log(`  ❌ Issues: ${issues.length} user(s)\n`);

    if (issues.length > 0) {
      console.log('🔴 ISSUES FOUND:\n');
      issues.forEach(issue => {
        console.log(`  ${issue.email} (${issue.tier}):`);
        console.log(`    - user_credit_balance.amount: ${issue.balanceAmount}`);
        console.log(`    - credits.total_credits: ${issue.creditTableAmount}`);
        console.log(`    - Expected (Plan 189): ${issue.expected}`);
        console.log(`    - Issue: ${issue.issue}\n`);
      });

      console.log('💡 Next step: Run fix-user-credit-balance.js to correct these issues.\n');
    } else {
      console.log('  ✅ All user credit balances match Plan 189 specifications!\n');
    }

    console.log('='.repeat(120) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserCreditBalance();
