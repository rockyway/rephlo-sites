const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTiers() {
  const tiers = await prisma.subscription_tier_config.findMany({
    orderBy: { monthly_credit_allocation: 'asc' },
  });

  console.log('\n✅ Tier Configurations in Database:\n');
  console.log('  TIER NAME            | PRICE USD  | CREDITS    | ACTIVE');
  console.log('  ' + '-'.repeat(70));

  tiers.forEach(t => {
    const price = `$${t.monthly_price_usd}`;
    const active = t.is_active ? '✓' : '✗ (Coming Soon)';
    console.log(`  ${t.tier_name.padEnd(20)} | ${price.padEnd(10)} | ${String(t.monthly_credit_allocation).padEnd(10)} | ${active}`);
  });

  console.log('\n');
  await prisma.$disconnect();
  process.exit(0);
}

checkTiers();
