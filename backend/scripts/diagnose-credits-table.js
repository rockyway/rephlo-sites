/**
 * Diagnose Credits Table Structure
 *
 * Examines credit records to understand credit_type, monthly_allocation,
 * and how they relate to user subscriptions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseCreditsTable() {
  console.log('\n🔍 CREDITS TABLE DIAGNOSTIC\n');
  console.log('='.repeat(130));

  try {
    const credits = await prisma.credits.findMany({
      include: {
        users: {
          select: { email: true },
        },
        subscriptions: {
          select: { tier: true, status: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    console.log(`\nTotal credit records: ${credits.length}\n`);

    console.log('EMAIL                          | SUB_TIER      | STATUS    | CREDIT_TYPE | TOTAL | USED | MONTHLY_ALLOC | IS_CURRENT');
    console.log('-'.repeat(130));

    credits.forEach(credit => {
      const email = (credit.users?.email || 'N/A').padEnd(30);
      const subTier = (credit.subscriptions?.tier || 'N/A').padEnd(13);
      const subStatus = (credit.subscriptions?.status || 'N/A').padEnd(9);
      const creditType = credit.credit_type.padEnd(11);
      const total = String(credit.total_credits).padEnd(5);
      const used = String(credit.used_credits).padEnd(4);
      const monthlyAlloc = String(credit.monthly_allocation).padEnd(13);
      const isCurrent = credit.is_current ? '✓' : '✗';

      console.log(`${email} | ${subTier} | ${subStatus} | ${creditType} | ${total} | ${used} | ${monthlyAlloc} | ${isCurrent}`);
    });

    console.log('\n' + '='.repeat(130));

    // Analyze discrepancies
    console.log('\n📊 DISCREPANCY ANALYSIS:\n');

    const issues = [];

    credits.forEach(credit => {
      const subTier = credit.subscriptions?.tier;
      const email = credit.users?.email;

      // Issue 1: credit_type doesn't match subscription tier
      if (subTier) {
        if (subTier === 'free' && credit.credit_type !== 'free') {
          issues.push({
            email,
            issue: `Free tier user has credit_type='${credit.credit_type}' (expected 'free')`,
          });
        } else if (subTier !== 'free' && credit.credit_type === 'free') {
          issues.push({
            email,
            issue: `${subTier.toUpperCase()} tier user has credit_type='free' (expected 'pro' or tier-specific)`,
          });
        }
      }

      // Issue 2: monthly_allocation doesn't match subscription tier
      const expectedAllocations = {
        free: 200,
        pro: 1500,
        pro_plus: 5000,
        pro_max: 25000,
        enterprise_pro: 3500,
        enterprise_pro_plus: 11000,
      };

      if (subTier && expectedAllocations[subTier]) {
        if (credit.monthly_allocation !== expectedAllocations[subTier]) {
          issues.push({
            email,
            issue: `${subTier} tier has monthly_allocation=${credit.monthly_allocation} (expected ${expectedAllocations[subTier]} per Plan 189)`,
          });
        }
      }

      // Issue 3: total_credits doesn't match monthly_allocation
      if (credit.total_credits !== credit.monthly_allocation) {
        issues.push({
          email,
          issue: `total_credits (${credit.total_credits}) != monthly_allocation (${credit.monthly_allocation})`,
        });
      }
    });

    if (issues.length === 0) {
      console.log('  ✅ No discrepancies found!\n');
    } else {
      console.log(`  ❌ Found ${issues.length} issue(s):\n`);
      issues.forEach(issue => {
        console.log(`  ${issue.email}: ${issue.issue}`);
      });
      console.log('');
    }

    console.log('='.repeat(130) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseCreditsTable();
