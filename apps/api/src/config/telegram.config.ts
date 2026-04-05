import { registerAs } from '@nestjs/config';

function parseTelegramIds(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default registerAs('telegram', () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botName: process.env.TELEGRAM_BOT_NAME || '',
  adminTelegramIds: parseTelegramIds(process.env.ADMIN_TELEGRAM_IDS),
  initDataMaxAgeSeconds: Number(process.env.TELEGRAM_INITDATA_MAX_AGE_SECONDS || '300'),
}));
