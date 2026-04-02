const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deposits = await prisma.deposit.findMany({
    where: { network: 'BSC', status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] } },
    take: 10
  });
  console.log(JSON.stringify(deposits, null, 2));
  process.exit();
}

main();