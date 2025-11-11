const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'testuser@example.com' },
    select: {
      email: true,
      emailVerificationToken: true,
      emailVerificationTokenExpiry: true
    }
  });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
