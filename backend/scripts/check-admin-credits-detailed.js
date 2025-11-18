/**
 * Detailed Admin Credit Check
 *
 * Examines the admin account in detail to understand credit discrepancy
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminCredits() {
  console.log('\n🔍 ADMIN ACCOUNT DETAILED CREDIT ANALYSIS\n');
  console.log('='.repeat(80));

  try {
    const admin = await prisma.users.findUnique({
      where: { email: 'admin.test@rephlo.ai' },
      include: {
        subscriptions: {
          orderBy: { created_at: 'desc' },
        },
        credits: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('\n📧 User Information:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Status: ${admin.status}`);
    console.log(`  Created: ${admin.created_at}`);

    console.log('\n💳 Subscription Details:');
    if (admin.subscriptions.length === 0) {
      console.log('  ❌ No subscriptions found');
    } else {
      admin.subscriptions.forEach((sub, index) => {
        console.log(`\n  Subscription ${index + 1}:`);
        console.log(`    ID: ${sub.id}`);
        console.log(`    Tier: ${sub.tier}`);
        console.log(`    Status: ${sub.status}`);
        console.log(`    Created: ${sub.created_at}`);
        console.log(`    Current Period Start: ${sub.current_period_start}`);
        console.log(`    Current Period End: ${sub.current_period_end}`);
      });
    }

    console.log('\n💰 Credit Records:');
    if (admin.credits.length === 0) {
      console.log('  ❌ No credit records found');
    } else {
      admin.credits.forEach((credit, index) => {
        console.log(`\n  Credit Record ${index + 1}:`);
        console.log(`    ID: ${credit.id}`);
        console.log(`    Monthly Allocation: ${credit.monthly_allocation} credits`);
        console.log(`    Balance: ${credit.balance} credits`);
        console.log(`    Used This Period: ${credit.used_this_period} credits`);
        console.log(`    Rollover: ${credit.rollover_credits} credits`);
        console.log(`    Period Start: ${credit.period_start}`);
        console.log(`    Period End: ${credit.period_end}`);
        console.log(`    Created: ${credit.created_at}`);
        console.log(`    Updated: ${credit.updated_at}`);
      });
    }

    // Calculate what the balance SHOULD be
    if (admin.credits.length > 0 && admin.subscriptions.length > 0) {
      const latestCredit = admin.credits[0];
      const latestSub = admin.subscriptions[0];

      console.log('\n📊 Analysis:');
      console.log(`  Tier: ${latestSub.tier} (should have 1500 monthly allocation per Plan 189)`);
      console.log(`  Monthly Allocation: ${latestCredit.monthly_allocation} (${latestCredit.monthly_allocation === 1500 ? '✅ CORRECT' : '❌ WRONG'})`);
      console.log(`  Current Balance: ${latestCredit.balance}`);
      console.log(`  Used This Period: ${latestCredit.used_this_period}`);
      console.log(`  Rollover Credits: ${latestCredit.rollover_credits}`);

      const expectedBalance = latestCredit.monthly_allocation + latestCredit.rollover_credits - latestCredit.used_this_period;
      console.log(`  Expected Balance: ${latestCredit.monthly_allocation} (allocation) + ${latestCredit.rollover_credits} (rollover) - ${latestCredit.used_this_period} (used) = ${expectedBalance}`);

      if (latestCredit.balance !== expectedBalance) {
        console.log(`  ⚠️  DISCREPANCY: Balance (${latestCredit.balance}) does not match expected (${expectedBalance})`);
      } else {
        console.log(`  ✅ Balance calculation is correct`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminCredits();
