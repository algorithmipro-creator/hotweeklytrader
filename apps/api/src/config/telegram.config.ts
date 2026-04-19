import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  webAppSecret: process.env.TELEGRAM_WEBAPP_SECRET || '',
  botName: process.env.TELEGRAM_BOT_NAME || '',
}));
