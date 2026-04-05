import * as dotenv from 'dotenv';
import { BotService } from './bot.service';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL || 'https://t.me/your_bot/app';
const adminAppUrl = process.env.ADMIN_APP_URL || '';
const adminTelegramIds = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => Number.parseInt(value, 10))
  .filter((value) => Number.isFinite(value));

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const botService = new BotService(token, miniAppUrl, adminAppUrl, adminTelegramIds);
botService.start().catch(console.error);

process.on('SIGINT', () => botService.stop());
process.on('SIGTERM', () => botService.stop());
