import * as dotenv from 'dotenv';
import { BotService } from './bot.service';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiBaseUrl = process.env.API_BASE_URL || 'http://api:3000/api/v1';
const miniAppUrl = process.env.MINI_APP_URL || 'https://your-domain.com/';
const adminAppUrl = process.env.ADMIN_APP_URL || '';
const referralCaptureSecret = process.env.REFERRAL_CAPTURE_SECRET || '';
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

const botService = new BotService(
  token,
  miniAppUrl,
  apiBaseUrl,
  referralCaptureSecret,
  adminAppUrl,
  adminTelegramIds,
);
botService.start().catch(console.error);

process.on('SIGINT', () => botService.stop());
process.on('SIGTERM', () => botService.stop());
