import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const admin = await prisma.users.findFirst({
    where: { email: 'admin.test@rephlo.ai' },
    select: {
      id: true,
      email: true
    }
  });

  if (!admin) {
    console.log('❌ Admin user not found');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('PLAN 208: Database-Level Credit Calculation Verification');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('👤 User Details:');
  console.log('   Email:', admin.email);
  console.log('   User ID:', admin.id, '\n');

  // Get user's current credits
  const currentCredits = await prisma.credits.findFirst({
    where: { user_id: admin.id, is_current: true },
    select: {
      total_credits: true,
      used_credits: true,
      billing_period_start: true,
      billing_period_end: true
    }
  });

  console.log('💰 Current Credits:');
  if (currentCredits) {
    console.log(`   Total: ${currentCredits.total_credits}`);
    console.log(`   Used: ${currentCredits.used_credits}`);
    console.log(`   Available: ${currentCredits.total_credits - currentCredits.used_credits}`);
    console.log(`   Period: ${currentCredits.billing_period_start.toISOString().split('T')[0]} to ${currentCredits.billing_period_end.toISOString().split('T')[0]}\n`);
  } else {
    console.log('   No current credit allocation found\n');
  }

  // Get credit increment setting
  const setting = await prisma.system_settings.findUnique({
    where: { key: 'credit_minimum_increment' }
  });

  console.log('⚙️  System Settings:');
  console.log('   Credit Minimum Increment: ' + (setting?.value || '0.1') + '\n');

  // Check token usage ledger to verify recent transactions
  const recentUsage = await prisma.token_usage_ledger.findMany({
    where: { user_id: admin.id },
    select: {
      id: true,
      request_id: true,
      model_id: true,
      input_tokens: true,
      output_tokens: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    take: 5
  });

  if (recentUsage.length > 0) {
    console.log('📋 Recent Token Usage (last 5 requests):');
    recentUsage.forEach((usage, idx) => {
      console.log(`   ${idx + 1}. Model: ${usage.model_id}`);
      console.log(`      Request ID: ${usage.request_id}`);
      console.log(`      Tokens: ${usage.input_tokens} input + ${usage.output_tokens} output`);
      console.log(`      Time: ${usage.created_at.toISOString()}\n`);
    });
  } else {
    console.log('📋 No recent token usage found in ledger\n');
  }

  // Check credit deduction ledger
  const recentDeductions = await prisma.credit_deduction_ledger.findMany({
    where: { user_id: admin.id },
    select: {
      id: true,
      amount: true,
      balance_before: true,
      balance_after: true,
      token_vendor_cost: true,
      margin_multiplier: true,
      gross_margin: true,
      reason: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    take: 5
  });

  if (recentDeductions.length > 0) {
    console.log('💳 Recent Credit Deductions (last 5):');
    recentDeductions.forEach((deduction, idx) => {
      console.log(`   ${idx + 1}. Amount Deducted: ${Number(deduction.amount)} credits`);
      console.log(`      Balance Before: ${Number(deduction.balance_before)}`);
      console.log(`      Balance After: ${Number(deduction.balance_after)}`);
      if (deduction.token_vendor_cost) {
        console.log(`      Vendor Cost: $${Number(deduction.token_vendor_cost).toFixed(8)}`);
      }
      if (deduction.margin_multiplier) {
        console.log(`      Margin Multiplier: ${Number(deduction.margin_multiplier)}x`);
      }
      if (deduction.gross_margin) {
        console.log(`      Gross Margin: $${Number(deduction.gross_margin).toFixed(8)}`);
      }
      console.log(`      Reason: ${deduction.reason}`);
      console.log(`      Time: ${deduction.created_at.toISOString()}\n`);
    });
  } else {
    console.log('💳 No recent credit deductions found\n');
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('✅ Plan 208 Database Verification Complete!');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(0);
}

test().catch(async (err) => {
  console.error('❌ Error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
