const { PrismaClient, InvestmentPeriodStatus, UserRole, UserStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function buildSeedReferralCode(prefix, telegramId) {
  return `${prefix}${telegramId.toString(36).toUpperCase()}`.slice(0, 24);
}

function getDefaultSprintWindow() {
  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
}

async function seedAdminUser() {
  const adminTelegramId = BigInt(process.env.SEED_ADMIN_TELEGRAM_ID || '0');
  if (adminTelegramId <= 0n) {
    return null;
  }

  return prisma.user.upsert({
    where: { telegram_id: adminTelegramId },
    update: {
      username: 'admin',
      display_name: 'System Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      telegram_id: adminTelegramId,
      referral_code: buildSeedReferralCode('ADMIN', adminTelegramId),
      username: 'admin',
      display_name: 'System Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
}

async function seedActiveSprintPeriod() {
  const { startDate, endDate } = getDefaultSprintWindow();

  const existingActivePeriod = await prisma.investmentPeriod.findFirst({
    where: {
      title: 'Sprint 1',
      period_type: 'sprint',
    },
  });

  if (existingActivePeriod) {
    return prisma.investmentPeriod.update({
      where: { investment_period_id: existingActivePeriod.investment_period_id },
      data: {
        start_date: startDate,
        end_date: endDate,
        lock_date: startDate,
        status: InvestmentPeriodStatus.ACTIVE,
        accepted_networks: ['BSC', 'TRON', 'TON'],
        accepted_assets: ['USDT', 'USDC'],
        minimum_amount_rules: { default: 100 },
        maximum_amount_rules: { default: 100000 },
      },
    });
  }

  return prisma.investmentPeriod.create({
    data: {
      title: 'Sprint 1',
      period_type: 'sprint',
      start_date: startDate,
      end_date: endDate,
      lock_date: startDate,
      status: InvestmentPeriodStatus.ACTIVE,
      accepted_networks: ['BSC', 'TRON', 'TON'],
      accepted_assets: ['USDT', 'USDC'],
      minimum_amount_rules: { default: 100 },
      maximum_amount_rules: { default: 100000 },
    },
  });
}

async function seedTrader(input) {
  const trader = await prisma.trader.upsert({
    where: { slug: input.slug },
    update: {
      nickname: input.nickname,
      display_name: input.display_name,
      description: input.description,
      profile_title: input.profile_title,
      status: 'ACTIVE',
    },
    create: {
      nickname: input.nickname,
      slug: input.slug,
      display_name: input.display_name,
      description: input.description,
      profile_title: input.profile_title,
      status: 'ACTIVE',
    },
  });

  await Promise.all(
    input.main_addresses.map(async (address) => {
      const existing = await prisma.traderMainAddress.findFirst({
        where: {
          trader_id: trader.trader_id,
          network: address.network,
          asset_symbol: address.asset_symbol,
          address: address.address,
        },
      });

      if (existing) {
        await prisma.traderMainAddress.update({
          where: { trader_main_address_id: existing.trader_main_address_id },
          data: { is_active: true },
        });
        return;
      }

      await prisma.traderMainAddress.create({
        data: {
          trader_id: trader.trader_id,
          network: address.network,
          asset_symbol: address.asset_symbol,
          address: address.address,
          is_active: true,
        },
      });
    }),
  );

  return trader;
}

async function seedTraders() {
  await seedTrader({
    nickname: '@flux_control',
    slug: 'flux-trader',
    display_name: 'Flux Trader',
    description:
      'AI assistant with tighter entry timing and conservative network allocation across multi-chain sprint deposits.',
    profile_title: 'semper in motu ai',
    main_addresses: [
      {
        network: 'TRON',
        asset_symbol: 'USDT',
        address: process.env.SEED_FLUX_TRON_USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      },
      {
        network: 'BSC',
        asset_symbol: 'USDT',
        address: process.env.SEED_FLUX_BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955',
      },
      {
        network: 'TON',
        asset_symbol: 'USDT',
        address: process.env.SEED_FLUX_TON_USDT_ADDRESS || 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
      },
    ],
  });

  await seedTrader({
    nickname: '@vector_pulse',
    slug: 'vector-pulse',
    display_name: 'Vector Pulse',
    description:
      'Signal-first assistant built for faster sprint reactions, clean reporting visibility, and sharper rhythm across weekly entries.',
    profile_title: 'vector pulse interface',
    main_addresses: [
      {
        network: 'TON',
        asset_symbol: 'USDT',
        address: process.env.SEED_VECTOR_TON_USDT_ADDRESS || 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      },
      {
        network: 'BSC',
        asset_symbol: 'USDT',
        address: process.env.SEED_VECTOR_BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955',
      },
    ],
  });
}

async function main() {
  await seedAdminUser();
  await seedActiveSprintPeriod();
  await seedTraders();

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
