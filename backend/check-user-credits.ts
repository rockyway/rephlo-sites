import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCredits() {
  const userId = 'bf9b6ede-a849-4b4a-8b08-2943de57a255';

  try {
    // Get credit balance
    const creditBalance = await prisma.user_credit_balance.findUnique({
      where: { user_id: userId },
      select: {
        amount: true,
        last_deduction_at: true,
        last_deduction_amount: true,
      },
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('USER CREDIT BALANCE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`User ID: ${userId}`);
    console.log(`Current Credits: ${creditBalance?.amount || 0}`);
    console.log(`Last Deduction: ${creditBalance?.last_deduction_amount || 0} (at ${creditBalance?.last_deduction_at?.toISOString() || 'N/A'})\n`);

    // Get recent usage
    const recentUsage = await prisma.token_usage_ledger.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        created_at: true,
        model_name: true,
        input_tokens: true,
        output_tokens: true,
        credits_charged: true,
      },
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('RECENT USAGE (Last 5 Entries)');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const usage of recentUsage) {
      console.log(`Date: ${usage.created_at.toISOString()}`);
      console.log(`Model: ${usage.model_name}`);
      console.log(`Input: ${usage.input_tokens}, Output: ${usage.output_tokens}`);
      console.log(`Credits: ${usage.credits_charged}\n`);
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUserCredits();
