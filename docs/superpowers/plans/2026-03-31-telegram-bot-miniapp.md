# Telegram Investment Service — Plan 3: Telegram Bot + Mini App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Telegram Bot for notifications and entry, plus the Telegram Mini App (Next.js) for deposit creation, tracking, reports, and support.

**Architecture:** Telegram Bot using `node-telegram-bot-api` or `grammY` as a separate service. Mini App using Next.js with Telegram Web App SDK. Both authenticate via the existing API's JWT flow. Mini App communicates with the backend API.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Telegram Web App SDK, grammY (bot), axios/fetch for API calls

---

### Task 1: Telegram Bot Service

**Files:**
- Create: `apps/bot/package.json`
- Create: `apps/bot/tsconfig.json`
- Create: `apps/bot/.env.example`
- Create: `apps/bot/src/main.ts`
- Create: `apps/bot/src/bot.module.ts`
- Create: `apps/bot/src/bot.service.ts`
- Create: `apps/bot/src/commands/start.command.ts`
- Create: `apps/bot/src/commands/menu.command.ts`
- Create: `apps/bot/src/middleware/auth.middleware.ts`
- Create: `apps/bot/src/services/notification.service.ts`

- [ ] **Step 1: Create bot package.json**

`apps/bot/package.json`:

```json
{
  "name": "@tis/bot",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "grammy": "^1.21.0",
    "dotenv": "^16.4.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create bot tsconfig.json**

`apps/bot/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .env.example**

`apps/bot/.env.example`:

```
# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_NAME=your_bot_name

# API
API_BASE_URL=http://localhost:3000/api/v1
API_JWT_SECRET=replace-with-secure-random-string
```

- [ ] **Step 4: Create bot service**

`apps/bot/src/bot.service.ts`:

```typescript
import { Bot, Context, session, SessionFlavor } from 'grammy';
import { InlineKeyboard } from 'grammy';

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

    this.bot.start();
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
        .url('📊 Open Mini App', this.miniAppUrl)
        .row()
        .text('❓ FAQ', 'faq')
        .text('🆘 Support', 'support');

      await ctx.reply(
        `Welcome to the Investment Service!\n\n` +
        `• Create deposits and track their status\n` +
        `• View reports and payout history\n` +
        `• Get notifications for important events\n\n` +
        `Tap the button below to get started:`,
        { reply_markup: keyboard },
      );
    });

    this.bot.command('menu', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .url('📊 Open Mini App', this.miniAppUrl)
        .row()
        .text('❓ FAQ', 'faq')
        .text('🆘 Support', 'support');

      await ctx.reply('Main menu:', { reply_markup: keyboard });
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `Available commands:\n` +
        `/start — Start the bot\n` +
        `/menu — Show main menu\n` +
        `/help — Show this help`,
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
      // Default handler for unrecognized text
      const keyboard = new InlineKeyboard()
        .url('📊 Open Mini App', this.miniAppUrl);

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
```

- [ ] **Step 5: Create main.ts**

`apps/bot/src/main.ts`:

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add apps/bot/
git commit -m "feat: Telegram bot with start, menu, FAQ, and support commands"
```

---

### Task 2: Mini App — Next.js Setup + Telegram SDK

**Files:**
- Create: `apps/miniapp/package.json`
- Create: `apps/miniapp/tsconfig.json`
- Create: `apps/miniapp/next.config.ts`
- Create: `apps/miniapp/tailwind.config.ts`
- Create: `apps/miniapp/postcss.config.js`
- Create: `apps/miniapp/src/app/layout.tsx`
- Create: `apps/miniapp/src/app/page.tsx`
- Create: `apps/miniapp/src/app/globals.css`
- Create: `apps/miniapp/src/lib/api.ts`
- Create: `apps/miniapp/src/lib/telegram.ts`
- Create: `apps/miniapp/src/providers/auth-provider.tsx`

- [ ] **Step 1: Create Mini App package.json**

`apps/miniapp/package.json`:

```json
{
  "name": "@tis/miniapp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@twa-dev/sdk": "^7.0.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create Next.js config**

`apps/miniapp/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create Tailwind config**

`apps/miniapp/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--tg-theme-button-color, #3b82f6)',
        'primary-text': 'var(--tg-theme-button-text-color, #ffffff)',
        bg: 'var(--tg-theme-bg-color, #0f172a)',
        'bg-secondary': 'var(--tg-theme-secondary-bg-color, #1e293b)',
        text: 'var(--tg-theme-text-color, #f8fafc)',
        'text-secondary': 'var(--tg-theme-hint-color, #94a3b8)',
        link: 'var(--tg-theme-link-color, #60a5fa)',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create postcss config**

`apps/miniapp/postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create global CSS**

`apps/miniapp/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --tg-theme-bg-color: #0f172a;
  --tg-theme-secondary-bg-color: #1e293b;
  --tg-theme-text-color: #f8fafc;
  --tg-theme-hint-color: #94a3b8;
  --tg-theme-link-color: #60a5fa;
  --tg-theme-button-color: #3b82f6;
  --tg-theme-button-text-color: #ffffff;
}

body {
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Status badge colors */
.status-active { @apply bg-green-500/20 text-green-400; }
.status-pending { @apply bg-yellow-500/20 text-yellow-400; }
.status-completed { @apply bg-blue-500/20 text-blue-400; }
.status-error { @apply bg-red-500/20 text-red-400; }
```

- [ ] **Step 6: Create Telegram SDK wrapper**

`apps/miniapp/src/lib/telegram.ts`:

```typescript
import WebApp from '@twa-dev/sdk';

export function initTelegramWebApp() {
  if (typeof window !== 'undefined' && WebApp.initData) {
    WebApp.ready();
    WebApp.expand();
    return WebApp;
  }
  return null;
}

export function getInitData(): string | undefined {
  if (typeof window !== 'undefined') {
    return WebApp.initData;
  }
  return undefined;
}

export function getUserFromWebApp() {
  if (typeof window !== 'undefined' && WebApp.initDataUnsafe?.user) {
    return WebApp.initDataUnsafe.user;
  }
  return null;
}

export { WebApp };
```

- [ ] **Step 7: Create API client**

`apps/miniapp/src/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function authenticateTelegram(initData: string) {
  const response = await api.post('/auth/telegram', { initData });
  if (response.data.accessToken) {
    localStorage.setItem('auth_token', response.data.accessToken);
  }
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/me');
  return response.data;
}

export async function getDeposits() {
  const response = await api.get('/deposits');
  return response.data;
}

export async function getDeposit(id: string) {
  const response = await api.get(`/deposits/${id}`);
  return response.data;
}

export async function createDeposit(data: {
  investment_period_id: string;
  network: string;
  asset_symbol: string;
  requested_amount?: number;
}) {
  const response = await api.post('/deposits', data);
  return response.data;
}

export async function getPeriods() {
  const response = await api.get('/periods');
  return response.data;
}

export default api;
```

- [ ] **Step 8: Create auth provider**

`apps/miniapp/src/providers/auth-provider.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateTelegram, getProfile } from '../lib/api';
import { getInitData, getUserFromWebApp } from '../lib/telegram';

interface User {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function authenticate() {
      try {
        const initData = getInitData();

        if (!initData) {
          setError('Telegram Web App data not available');
          setLoading(false);
          return;
        }

        const existingToken = localStorage.getItem('auth_token');
        if (existingToken) {
          try {
            const profile = await getProfile();
            setUser(profile);
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem('auth_token');
          }
        }

        const result = await authenticateTelegram(initData);
        setUser(result.user);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }

    authenticate();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 9: Create layout**

`apps/miniapp/src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { AuthProvider } from '../providers/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Investment Service',
  description: 'Managed trading via Telegram',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main className="min-h-screen bg-bg text-text">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Create home page**

`apps/miniapp/src/app/page.tsx`:

```typescript
'use client';

import { useAuth } from '../providers/auth-provider';

export default function HomePage() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Investment Service</h1>
        {user && (
          <p className="text-text-secondary text-sm mt-1">
            Welcome, {user.display_name || user.username || 'User'}
          </p>
        )}
      </header>

      <nav className="space-y-3">
        <a href="/deposits" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">My Deposits</div>
          <div className="text-text-secondary text-sm">View and track your deposits</div>
        </a>

        <a href="/create-deposit" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">New Deposit</div>
          <div className="text-text-secondary text-sm">Create a new deposit</div>
        </a>

        <a href="/faq" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">FAQ</div>
          <div className="text-text-secondary text-sm">Frequently asked questions</div>
        </a>

        <a href="/support" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">Support</div>
          <div className="text-text-secondary text-sm">Contact us for help</div>
        </a>
      </nav>
    </div>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add apps/miniapp/
git commit -m "feat: Mini App setup with Next.js, Telegram SDK, and auth"
```

---

### Task 3: Mini App — Deposits List + Detail Pages

**Files:**
- Create: `apps/miniapp/src/app/deposits/page.tsx`
- Create: `apps/miniapp/src/app/deposits/[id]/page.tsx`
- Create: `apps/miniapp/src/components/status-badge.tsx`
- Create: `apps/miniapp/src/components/deposit-card.tsx`
- Create: `apps/miniapp/src/components/timeline.tsx`

- [ ] **Step 1: Create status badge component**

`apps/miniapp/src/components/status-badge.tsx`:

```typescript
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CREATED: { label: 'Created', className: 'bg-gray-500/20 text-gray-400' },
  AWAITING_TRANSFER: { label: 'Awaiting Transfer', className: 'bg-yellow-500/20 text-yellow-400' },
  DETECTED: { label: 'Detected', className: 'bg-blue-500/20 text-blue-400' },
  CONFIRMING: { label: 'Confirming', className: 'bg-blue-500/20 text-blue-400' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-500/20 text-green-400' },
  ACTIVE: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  REPORT_READY: { label: 'Report Ready', className: 'bg-purple-500/20 text-purple-400' },
  PAYOUT_PENDING: { label: 'Payout Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  PAYOUT_APPROVED: { label: 'Payout Approved', className: 'bg-green-500/20 text-green-400' },
  PAYOUT_SENT: { label: 'Payout Sent', className: 'bg-green-500/20 text-green-400' },
  PAYOUT_CONFIRMED: { label: 'Payout Confirmed', className: 'bg-green-500/20 text-green-400' },
  ON_HOLD: { label: 'On Hold', className: 'bg-orange-500/20 text-orange-400' },
  MANUAL_REVIEW: { label: 'Manual Review', className: 'bg-orange-500/20 text-orange-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/20 text-red-400' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, className: 'bg-gray-500/20 text-gray-400' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
```

- [ ] **Step 2: Create deposit card component**

`apps/miniapp/src/components/deposit-card.tsx`:

```typescript
import Link from 'next/link';
import { StatusBadge } from './status-badge';

interface DepositCardProps {
  deposit: {
    deposit_id: string;
    network: string;
    asset_symbol: string;
    confirmed_amount: number | null;
    status: string;
    created_at: string;
    deposit_route: string;
  };
}

export function DepositCard({ deposit }: DepositCardProps) {
  return (
    <Link href={`/deposits/${deposit.deposit_id}`} className="block">
      <div className="p-4 bg-bg-secondary rounded-lg mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{deposit.network} / {deposit.asset_symbol}</span>
          <StatusBadge status={deposit.status} />
        </div>

        {deposit.confirmed_amount && (
          <div className="text-lg font-bold mb-1">
            {deposit.confirmed_amount} {deposit.asset_symbol}
          </div>
        )}

        <div className="text-text-secondary text-xs">
          Created: {new Date(deposit.created_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Create timeline component**

`apps/miniapp/src/components/timeline.tsx`:

```typescript
interface TimelineEvent {
  label: string;
  date: string | null;
  completed: boolean;
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${event.completed ? 'bg-green-500' : 'bg-gray-600'}`} />
            {index < events.length - 1 && (
              <div className={`w-0.5 h-8 ${event.completed ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
          <div>
            <div className={`text-sm ${event.completed ? 'text-text' : 'text-text-secondary'}`}>
              {event.label}
            </div>
            {event.date && (
              <div className="text-xs text-text-secondary">
                {new Date(event.date).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create deposits list page**

`apps/miniapp/src/app/deposits/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDeposits } from '../../lib/api';
import { DepositCard } from '../../components/deposit-card';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeposits()
      .then(setDeposits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Deposits</h1>
        <Link href="/create-deposit" className="text-primary text-sm">
          + New Deposit
        </Link>
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading...</div>
      ) : deposits.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p className="mb-4">No deposits yet</p>
          <Link href="/create-deposit" className="text-primary">
            Create your first deposit →
          </Link>
        </div>
      ) : (
        deposits.map((deposit) => (
          <DepositCard key={deposit.deposit_id} deposit={deposit} />
        ))
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        ← Back to Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Create deposit detail page**

`apps/miniapp/src/app/deposits/[id]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDeposit } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';
import { Timeline } from '../../../components/timeline';

export default function DepositDetailPage() {
  const params = useParams();
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      getDeposit(params.id as string)
        .then(setDeposit)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-4 text-text-secondary">Loading...</div>;
  }

  if (!deposit) {
    return <div className="p-4 text-red-400">Deposit not found</div>;
  }

  const timelineEvents = [
    { label: 'Deposit Created', date: deposit.created_at, completed: true },
    { label: 'Transfer Detected', date: deposit.detected_at, completed: !!deposit.detected_at },
    { label: 'Confirmed', date: deposit.confirmed_at, completed: !!deposit.confirmed_at },
    { label: 'Active', date: deposit.activated_at, completed: !!deposit.activated_at },
    { label: 'Completed', date: deposit.completed_at, completed: !!deposit.completed_at },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Deposit Details</h1>
        <StatusBadge status={deposit.status} />
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-text-secondary">Network</div>
            <div className="font-medium">{deposit.network}</div>
          </div>
          <div>
            <div className="text-text-secondary">Asset</div>
            <div className="font-medium">{deposit.asset_symbol}</div>
          </div>
          {deposit.confirmed_amount && (
            <div>
              <div className="text-text-secondary">Amount</div>
              <div className="font-medium">{deposit.confirmed_amount} {deposit.asset_symbol}</div>
            </div>
          )}
          {deposit.tx_hash && (
            <div>
              <div className="text-text-secondary">TX Hash</div>
              <div className="font-medium text-link truncate">{deposit.tx_hash}</div>
            </div>
          )}
          {deposit.activated_at && (
            <>
              <div>
                <div className="text-text-secondary">Start Date</div>
                <div className="font-medium">{new Date(deposit.activated_at).toLocaleDateString()}</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Status Timeline</h2>
        <Timeline events={timelineEvents} />
      </div>

      {deposit.status_reason && (
        <div className="bg-bg-secondary rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-2">Note</h2>
          <p className="text-text-secondary text-sm">{deposit.status_reason}</p>
        </div>
      )}

      <Link href="/deposits" className="block text-center text-primary">
        ← Back to Deposits
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/miniapp/src/components/ apps/miniapp/src/app/deposits/
git commit -m "feat: deposits list and detail pages with status timeline"
```

---

### Task 4: Mini App — Create Deposit + Period Selection

**Files:**
- Create: `apps/miniapp/src/app/create-deposit/page.tsx`
- Create: `apps/miniapp/src/app/faq/page.tsx`
- Create: `apps/miniapp/src/app/support/page.tsx`

- [ ] **Step 1: Create deposit page**

`apps/miniapp/src/app/create-deposit/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPeriods, createDeposit } from '../../lib/api';

const NETWORKS = ['BSC', 'TRON', 'TON', 'ETH', 'SOL'];

export default function CreateDepositPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeriods()
      .then(setPeriods)
      .catch(console.error);
  }, []);

  const currentPeriod = periods.find((p) => p.investment_period_id === selectedPeriod);
  const availableAssets = currentPeriod?.accepted_assets || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deposit = await createDeposit({
        investment_period_id: selectedPeriod,
        network: selectedNetwork,
        asset_symbol: selectedAsset,
      });

      router.push(`/deposits/${deposit.deposit_id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">New Deposit</h1>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Investment Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setSelectedAsset('');
            }}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
          >
            <option value="">Select a period...</option>
            {periods.map((p) => (
              <option key={p.investment_period_id} value={p.investment_period_id}>
                {p.title} ({new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Network</label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
          >
            <option value="">Select a network...</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
            disabled={!currentPeriod}
          >
            <option value="">Select an asset...</option>
            {availableAssets.map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPeriod || !selectedNetwork || !selectedAsset}
          className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Deposit'}
        </button>
      </form>

      <Link href="/deposits" className="block text-center text-primary mt-6">
        ← Back to Deposits
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create FAQ page**

`apps/miniapp/src/app/faq/page.tsx`:

```typescript
'use client';

import Link from 'next/link';

const FAQS = [
  {
    q: 'How do I make a deposit?',
    a: 'Open the Mini App, go to "New Deposit", select a network and investment period, then follow the transfer instructions. Send the exact amount to the provided address.',
  },
  {
    q: 'How long does confirmation take?',
    a: 'Confirmation depends on the blockchain network. BSC typically takes ~12 confirmations (~3 min), ETH ~12 confirmations (~3 min), TRON ~19 confirmations (~6 sec).',
  },
  {
    q: 'When do I get my payout?',
    a: 'Payouts are processed after the trading period ends and the report is approved by the admin. You will receive a notification when the payout is sent.',
  },
  {
    q: 'What networks are supported?',
    a: 'Currently supported: BSC, TRON, TON, ETH, and SOL. Check the Mini App for the latest list of supported networks and assets.',
  },
  {
    q: 'What happens if I send the wrong token?',
    a: 'If you send an unsupported token, your deposit will be marked for manual review. Contact support with the transaction hash for assistance.',
  },
  {
    q: 'Can I have multiple deposits?',
    a: 'Yes, you can have multiple active deposits across different networks and periods. Each deposit is tracked independently.',
  },
];

export default function FaqPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">FAQ</h1>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg p-4">
            <h3 className="font-medium mb-2">{faq.q}</h3>
            <p className="text-text-secondary text-sm">{faq.a}</p>
          </div>
        ))}
      </div>

      <Link href="/" className="block text-center text-primary mt-6">
        ← Back to Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Create support page**

`apps/miniapp/src/app/support/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In MVP, this would create a support case via API
    setSubmitted(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Support</h1>

      {submitted ? (
        <div className="bg-green-500/20 text-green-400 p-4 rounded-lg text-center">
          <p className="font-medium mb-2">Message Sent!</p>
          <p className="text-sm">Our team will respond as soon as possible.</p>
          <Link href="/" className="block text-primary mt-4">
            ← Back to Home
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-bg-secondary rounded-lg text-text min-h-[120px]"
              placeholder="Describe your issue or question..."
              required
            />
          </div>

          <button
            type="submit"
            className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium"
          >
            Send Message
          </button>
        </form>
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        ← Back to Home
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/miniapp/src/app/create-deposit/ apps/miniapp/src/app/faq/ apps/miniapp/src/app/support/
git commit -m "feat: create deposit, FAQ, and support pages"
```

---

## Plan 3 Summary — What's Built

| Component | Description | Status |
|---|---|---|
| Telegram Bot | grammY bot with /start, /menu, /help, FAQ, support | ✅ |
| Mini App Setup | Next.js 14 + Tailwind + Telegram Web App SDK | ✅ |
| Auth Provider | Telegram initData → JWT → profile | ✅ |
| Home Page | Navigation hub with user greeting | ✅ |
| Deposits List | User's deposits with status badges | ✅ |
| Deposit Detail | Full details + status timeline | ✅ |
| Create Deposit | Period/network/asset selection | ✅ |
| FAQ Page | Common questions and answers | ✅ |
| Support Page | Message form (MVP placeholder) | ✅ |

## What's NOT in Plan 3

- Actual bot notifications integration with API — scaffolding done
- Support case API integration — UI done, backend in Plan 6
- Report viewing page — Plan 4
- Deposit transfer instructions screen (with QR code) — needs blockchain address generation
