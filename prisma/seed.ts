import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin users
  await prisma.user.upsert({
    where: { walletAddress: '0xAdmin1' },
    update: {},
    create: {
      walletAddress: '0xAdmin1',
      isAdmin: true,
      convictionPoints: 25,
    },
  });

  // Seed regular users
  const users = ['0xUser1', '0xUser2', '0xUser3'];
  for (const address of users) {
    await prisma.user.upsert({
      where: { walletAddress: address },
      update: {},
      create: {
        walletAddress: address,
        isAdmin: false,
        convictionPoints: Math.floor(Math.random() * 10),
      },
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
