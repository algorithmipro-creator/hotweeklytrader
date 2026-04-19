import axios from 'axios';
import { Bot, Context, session, SessionFlavor, InlineKeyboard } from 'grammy';

interface SessionData {
  userId?: string;
  telegramId: number;
  username?: string;
  referralCode?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

export class BotService {
  private bot: Bot<MyContext>;
  private adminAppUrl?: string;
  private adminTelegramIds: Set<number>;

  constructor(
    private token: string,
    private miniAppUrl: string,
    private apiBaseUrl: string,
    private referralCaptureSecret?: string,
    adminAppUrl?: string,
    adminTelegramIds: number[] = [],
  ) {
    this.bot = new Bot<MyContext>(token);
    this.bot.use(session({ initial: (): SessionData => ({ telegramId: 0 }) }));
    this.adminAppUrl = adminAppUrl;
    this.adminTelegramIds = new Set(adminTelegramIds);
  }

  async start(): Promise<void> {
    this.registerCommands();
    this.registerHandlers();
    await this.bot.start();
    console.log('Bot is running...');
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }

  private registerCommands(): void {
    this.bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id || 0;
      ctx.session.telegramId = telegramId;
      ctx.session.username = ctx.from?.username;
      const referralCode = this.extractReferralCodeFromStartPayload(ctx.match);
      ctx.session.referralCode = referralCode ?? undefined;

      if (referralCode && telegramId) {
        await this.capturePendingReferral({
          telegramId,
          referralCode,
          source: 'telegram_menu_button',
        });
      }

      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.buildMiniAppUrl(referralCode))
        .row()
        .text('\u2753 FAQ', 'faq')
        .text('\uD83C\uDD98 Support', 'support');

      await ctx.reply(
        `Доступ открыт!\n\n` +
        `Перед вами система алгоритмов, которая работает с движением рынка и потоками данных.\n\n` +
        `\u2022 Вы выбираете алгоритм — запускается процесс работы.\n\n` +
        `\u2022 Всё остальное происходит в рамках системы.\n\n` +
        `Нажмите кнопку ниже, чтобы начать.`,
        { reply_markup: keyboard },
      );
    });

    this.bot.command('menu', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.buildMiniAppUrl(ctx.session.referralCode))
        .row()
        .text('\u2753 FAQ', 'faq')
        .text('\uD83C\uDD98 Support', 'support');

      await ctx.reply('Main menu:', { reply_markup: keyboard });
    });

    this.bot.command('help', async (ctx) => {
      const isAdmin = this.isAdmin(ctx.from?.id || 0);
      await ctx.reply(
        `Available commands:\n` +
        `/start \u2014 Start the bot\n` +
        `/menu \u2014 Show main menu\n` +
        `/help \u2014 Show this help` +
        (isAdmin ? `\n/admin \u2014 Open admin panel` : ''),
      );
    });

    this.bot.command('admin', async (ctx) => {
      const telegramId = ctx.from?.id || 0;

      if (!this.isAdmin(telegramId)) {
        await ctx.reply('Access denied.');
        return;
      }

      if (!this.adminAppUrl) {
        await ctx.reply('Admin panel URL is not configured.');
        return;
      }

      const keyboard = new InlineKeyboard().webApp('\uD83D\uDEE0 Open Admin Panel', this.adminAppUrl);
      await ctx.reply('Admin access granted. Open the admin panel below:', {
        reply_markup: keyboard,
      });
    });
  }

  private registerHandlers(): void {
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      switch (data) {
        case 'faq':
          await ctx.reply(
            `Ответы на частые вопросы находятся в приложении.\n\n` +
            `Откройте приложение и перейдите в раздел FAQ.`,
          );
          break;

        case 'support':
          await ctx.reply(
            `Поддержка доступна внутри приложения.\n\n` +
            `Откройте приложение и перейдите в раздел Support.`,
          );
          break;

        default:
          await ctx.answerCallbackQuery('Unknown action');
      }
    });

    this.bot.on('message:text', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.buildMiniAppUrl(ctx.session.referralCode));

      await ctx.reply(
        `I didn't understand that. Use /menu to see available options.`,
        { reply_markup: keyboard },
      );
    });
  }

  async sendNotification(telegramId: number, message: string, keyboard?: InlineKeyboard): Promise<void> {
    try {
      await this.bot.api.sendMessage(telegramId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });
    } catch (error: any) {
      if (error.error_code === 403) {
        console.warn(`User ${telegramId} blocked the bot`);
      } else {
        console.error(`Failed to send notification to ${telegramId}:`, error);
      }
    }
  }

  private isAdmin(telegramId: number): boolean {
    return this.adminTelegramIds.has(telegramId);
  }

  private extractReferralCodeFromStartPayload(payload: string | undefined): string | null {
    const normalizedPayload = payload?.trim();
    if (!normalizedPayload?.toLowerCase().startsWith('ref_')) {
      return null;
    }

    const referralCode = normalizedPayload.slice(4).trim().toUpperCase();
    return referralCode || null;
  }

  private buildMiniAppUrl(referralCode?: string | null): string {
    if (!referralCode) {
      return this.miniAppUrl;
    }

    const url = new URL(this.miniAppUrl);
    url.searchParams.set('ref', referralCode);
    return url.toString();
  }

  private async capturePendingReferral(input: {
    telegramId: number;
    referralCode: string;
    source: string;
  }): Promise<void> {
    if (!this.apiBaseUrl || !this.referralCaptureSecret) {
      return;
    }

    try {
      await axios.post(`${this.apiBaseUrl}/referrals/pending`, {
        telegramId: String(input.telegramId),
        referralCode: input.referralCode,
        source: input.source,
      }, {
        headers: {
          'x-referral-capture-secret': this.referralCaptureSecret,
        },
      });
    } catch (error) {
      console.warn('Failed to capture pending referral payload', error);
    }
  }
}
