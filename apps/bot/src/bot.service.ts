import { Bot, Context, session, SessionFlavor, InlineKeyboard } from 'grammy';

interface SessionData {
  userId?: string;
  telegramId: number;
  username?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

export class BotService {
  private bot: Bot<MyContext>;

  constructor(
    private token: string,
    private miniAppUrl: string,
  ) {
    this.bot = new Bot<MyContext>(token);
    this.bot.use(session({ initial: (): SessionData => ({ telegramId: 0 }) }));
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

      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.miniAppUrl)
        .row()
        .text('\u2753 FAQ', 'faq')
        .text('\uD83C\uDD98 Support', 'support');

      await ctx.reply(
        `Welcome to the Investment Service!\n\n` +
        `\u2022 Create deposits and track their status\n` +
        `\u2022 View reports and payout history\n` +
        `\u2022 Get notifications for important events\n\n` +
        `Tap the button below to get started:`,
        { reply_markup: keyboard },
      );
    });

    this.bot.command('menu', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.miniAppUrl)
        .row()
        .text('\u2753 FAQ', 'faq')
        .text('\uD83C\uDD98 Support', 'support');

      await ctx.reply('Main menu:', { reply_markup: keyboard });
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `Available commands:\n` +
        `/start \u2014 Start the bot\n` +
        `/menu \u2014 Show main menu\n` +
        `/help \u2014 Show this help`,
      );
    });
  }

  private registerHandlers(): void {
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      switch (data) {
        case 'faq':
          await ctx.reply(
            `*Frequently Asked Questions*\n\n` +
            `*How do I make a deposit?*\n` +
            `Open the Mini App, select a network and period, then follow the transfer instructions.\n\n` +
            `*How long does confirmation take?*\n` +
            `Deposits are confirmed after the required number of blockchain confirmations (varies by network).\n\n` +
            `*When do I get my payout?*\n` +
            `Payouts are processed after the trading period ends and the report is approved.\n\n` +
            `*What networks are supported?*\n` +
            `BSC, TRON, TON, ETH, and SOL (check the Mini App for the current list).`,
            { parse_mode: 'Markdown' },
          );
          break;

        case 'support':
          await ctx.reply(
            `To contact support:\n\n` +
            `1. Open the Mini App and go to Support\n` +
            `2. Describe your issue\n` +
            `3. Our team will respond as soon as possible\n\n` +
            `For urgent matters, include your Telegram ID in the message.`,
          );
          break;

        default:
          await ctx.answerCallbackQuery('Unknown action');
      }
    });

    this.bot.on('message:text', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .webApp('\uD83D\uDCCA Open Mini App', this.miniAppUrl);

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
}
