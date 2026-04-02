const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const currentBlock = 90188459;
const txBlock = 90182348; // block of 0x899524b3928ab28d7cc46360ea034149e6c0c549dc353c0f62438a900b432a3c

p.deposit.findMany({
  where: { network: 'BSC', source_address: { not: null } },
  select: { deposit_id: true, source_address: true, created_at: true }
}).then(r => {
  console.log('Current block:', currentBlock);
  console.log('TX block:', txBlock);
  console.log('Blocks to scan from deposit creation:');
  r.forEach(d => {
    const createdTime = new Date(d.created_at).getTime();
    const blocksAgo = Math.floor((Date.now() - createdTime) / 3000);
    console.log(d.source_address, 'created:', d.created_at, '~blocks ago:', blocksAgo);
  });
  process.exit(0);
});