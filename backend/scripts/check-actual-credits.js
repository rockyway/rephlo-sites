/**
 * Check Actual Credit Values
 *
 * Examines the actual credits table fields (not phantom fields)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkActualCredits() {
  console.log('\n💰 ACTUAL CREDIT RECORDS IN DATABASE\n');
  console.log('='.repeat(120));

  try {
    const credits = await prisma.credits.findMany({
      include: {
        users: {
          select: {
            email: true,
          },
        },
        subscriptions: {
          select: {
            tier: true,
            status: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    console.log(`\nFound ${credits.length} credit records\n`);

    console.log('EMAIL                          | TIER      | TOTAL_CREDITS | USED_CREDITS | MONTHLY_ALLOCATION | CREDIT_TYPE | IS_CURRENT');
    console.log('-'.repeat(120));

    credits.forEach(credit => {
      const email = (credit.users?.email || 'N/A').padEnd(30);
      const tier = (credit.subscriptions?.tier || 'N/A').padEnd(9);
      const totalCredits = String(credit.total_credits || 0).padEnd(13);
      const usedCredits = String(credit.used_credits || 0).padEnd(12);
      const monthlyAllocation = String(credit.monthly_allocation || 0).padEnd(18);
      const creditType = credit.credit_type.padEnd(11);
      const isCurrent = credit.is_current ? '✓' : '✗';

      console.log(`${email} | ${tier} | ${totalCredits} | ${usedCredits} | ${monthlyAllocation} | ${creditType} | ${isCurrent}`);
    });

    console.log('\n' + '='.repeat(120));

    // Check for discrepancies
    console.log('\n📊 DISCREPANCY ANALYSIS:\n');

    const plan189 = {
      free: 200,
      pro: 1500,
      pro_plus: 5000,
      pro_max: 25000,
      enterprise_pro: 3500,
      enterprise_pro_plus: 11000,
    };

    const issues = [];

    credits.forEach(credit => {
      const tier = credit.subscriptions?.tier;
      const email = credit.users?.email;

      if (tier && plan189[tier]) {
        const expected = plan189[tier];

        if (credit.total_credits !== expected) {
          issues.push({
            field: 'total_credits',
            email,
            tier,
            actual: credit.total_credits,
            expected,
          });
        }

        if (credit.monthly_allocation !== expected) {
          issues.push({
            field: 'monthly_allocation',
            email,
            tier,
            actual: credit.monthly_allocation,
            expected,
          });
        }
      }
    });

    if (issues.length === 0) {
      console.log('  ✅ No discrepancies found - all values match Plan 189!\n');
    } else {
      console.log(`  ❌ Found ${issues.length} discrepancies:\n`);
      issues.forEach(issue => {
        console.log(`  ${issue.email} (${issue.tier}): ${issue.field} = ${issue.actual} (expected ${issue.expected})`);
      });
      console.log('');
    }

    console.log('='.repeat(120) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualCredits();
