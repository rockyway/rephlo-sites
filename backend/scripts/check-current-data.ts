/**
 * Quick Data Check Script
 * Verifies current state of credit data in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 CURRENT DATABASE STATE\n');
  console.log('='.repeat(120));

  // Get all current credits with user and subscription info
  const credits = await prisma.credits.findMany({
    where: {
      is_current: true,
    },
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
      users: {
        email: 'asc',
      },
    },
  });

  console.log(`\nFound ${credits.length} current credit records:\n`);

  if (credits.length === 0) {
    console.log('  No current credit records found in database.');
    console.log('  This is normal for a fresh/test database.');
  } else {
    console.log('  EMAIL                          | TIER      | CREDIT_TYPE | MONTHLY_ALLOC | TOTAL | USED  | REMAINING');
    console.log('  ' + '-'.repeat(115));

    for (const credit of credits) {
      const email = credit.users?.email || 'Unknown';
      const tier = credit.subscriptions?.tier || 'N/A';
      const creditType = credit.credit_type || 'N/A';
      const monthlyAlloc = credit.monthly_allocation || 0;
      const total = credit.total_credits;
      const used = credit.used_credits;
      const remaining = total - used;

      console.log(
        `  ${email.padEnd(30)} | ${tier.padEnd(9)} | ${creditType.padEnd(11)} | ${String(monthlyAlloc).padEnd(13)} | ${String(total).padEnd(5)} | ${String(used).padEnd(5)} | ${remaining}`
      );
    }
  }

  console.log('\n' + '='.repeat(120));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
