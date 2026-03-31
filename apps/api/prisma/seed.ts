import { PrismaClient, UserStatus, InvestmentPeriodStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default super admin
  const adminTelegramId = BigInt(process.env.SEED_ADMIN_TELEGRAM_ID || '0');
  if (adminTelegramId > 0n) {
    await prisma.user.upsert({
      where: { telegram_id: adminTelegramId },
      update: {},
      create: {
        telegram_id: adminTelegramId,
        username: 'admin',
        display_name: 'System Admin',
        status: UserStatus.ACTIVE,
      },
    });
  }

  // Create sample investment period for testing
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.investmentPeriod.create({
    data: {
      title: 'Test Period 2026-Q2',
      period_type: 'fixed',
      start_date: startDate,
      end_date: endDate,
      lock_date: startDate,
      status: InvestmentPeriodStatus.DRAFT,
      accepted_networks: ['BSC', 'TRON', 'TON'],
      accepted_assets: ['USDT', 'USDC'],
      minimum_amount_rules: { default: 100 },
      maximum_amount_rules: { default: 100000 },
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
