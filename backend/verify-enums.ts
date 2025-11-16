import { PrismaClient, subscription_tier } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEnums() {
  console.log('=== Subscription Tier Enum Verification ===\n');

  console.log('Available subscription_tier enum values:');
  const enumValues = Object.keys(subscription_tier);
  enumValues.forEach((value, index) => {
    console.log(`  ${index + 1}. ${value}`);
  });

  console.log('\n✅ Expected values:');
  const expected = ['free', 'pro', 'pro_plus', 'pro_max', 'enterprise_pro', 'enterprise_pro_plus', 'enterprise_max', 'perpetual'];
  expected.forEach((value, index) => {
    const exists = enumValues.includes(value);
    console.log(`  ${index + 1}. ${value} - ${exists ? '✅ Present' : '❌ Missing'}`);
  });

  await prisma.$disconnect();
}

verifyEnums().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
