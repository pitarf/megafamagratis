const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const attempts = await prisma.orderAttempt.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(attempts, null, 2));
}

main().finally(() => prisma.$disconnect());
