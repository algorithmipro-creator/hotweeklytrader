import { registerAs } from '@nestjs/config';

export default registerAs('admin', () => ({
  webLogin: process.env.ADMIN_WEB_LOGIN || '',
  webPassword: process.env.ADMIN_WEB_PASSWORD || '',
  ownerTelegramId: process.env.ADMIN_OWNER_TELEGRAM_ID || '',
}));
