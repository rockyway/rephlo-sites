import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== All Users and Their Credits ===\n');

  const allUsers = await prisma.user.findMany({
    include: {
      credits: true,
      subscriptions: true
    }
  });

  allUsers.forEach((user: any) => {
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Credits: ${user.credits?.length || 0} records`);
    user.credits?.forEach((c: any) => {
      console.log(`  - Total: ${c.totalCredits}, Used: ${c.usedCredits}, Active: ${c.isCurrent}`);
    });
    console.log(`Subscriptions: ${user.subscriptions?.length || 0}`);
    user.subscriptions?.forEach((s: any) => {
      console.log(`  - Tier: ${s.tier}, Status: ${s.status}, Monthly Credits: ${s.creditsPerMonth}`);
    });
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
