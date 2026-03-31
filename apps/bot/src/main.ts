import * as dotenv from 'dotenv';
import { BotService } from './bot.service';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL || 'https://t.me/your_bot/app';

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const botService = new BotService(token, miniAppUrl);
botService.start().catch(console.error);

process.on('SIGINT', () => botService.stop());
process.on('SIGTERM', () => botService.stop());
