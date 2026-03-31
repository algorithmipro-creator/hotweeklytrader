# Telegram Investment Service — Plan 5: Admin Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Admin Panel (Next.js) for operators and administrators to manage users, deposits, periods, reports, payouts, audit logs, and system health.

**Architecture:** Next.js 14 App Router with Tailwind CSS, separate from the Mini App. Uses the same API with JWT auth. Admin-specific middleware for role-based route protection.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, axios

---

### Task 1: Admin Panel — Setup + Auth + Layout

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/next.config.ts`
- Create: `apps/admin/tailwind.config.ts`
- Create: `apps/admin/postcss.config.js`
- Create: `apps/admin/src/app/layout.tsx`
- Create: `apps/admin/src/app/page.tsx`
- Create: `apps/admin/src/app/globals.css`
- Create: `apps/admin/src/app/login/page.tsx`
- Create: `apps/admin/src/lib/api.ts`
- Create: `apps/admin/src/providers/auth-provider.tsx`
- Create: `apps/admin/src/components/sidebar.tsx`

- [ ] **Step 1: Create admin package.json**

`apps/admin/package.json`:

```json
{
  "name": "@tis/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
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

- [ ] **Step 2: Create admin tsconfig.json**

`apps/admin/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

`apps/admin/next.config.ts`:

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

- [ ] **Step 4: Create tailwind.config.ts**

`apps/admin/tailwind.config.ts`:

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
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        bg: '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        text: '#f8fafc',
        'text-secondary': '#94a3b8',
        link: '#60a5fa',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.js**

`apps/admin/postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create globals.css**

`apps/admin/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0f172a;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

table {
  border-collapse: separate;
  border-spacing: 0;
}

tbody tr:hover {
  background-color: #1e293b;
}
```

- [ ] **Step 7: Create API client**

`apps/admin/src/lib/api.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export async function adminLogin(telegramInitData: string) {
  const response = await api.post('/auth/telegram', { initData: telegramInitData });
  if (response.data.accessToken) {
    localStorage.setItem('admin_token', response.data.accessToken);
  }
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/me');
  return response.data;
}

// Users
export async function getAdminUsers(params?: { search?: string; status?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(userId: string, status: string) {
  const response = await api.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
}

// Periods
export async function getAdminPeriods(params?: { status?: string }) {
  const response = await api.get('/admin/periods', { params });
  return response.data;
}

export async function createPeriod(data: any) {
  const response = await api.post('/admin/periods', data);
  return response.data;
}

export async function updatePeriod(id: string, data: any) {
  const response = await api.put(`/admin/periods/${id}`, data);
  return response.data;
}

export async function updatePeriodStatus(id: string, status: string) {
  const response = await api.put(`/admin/periods/${id}/status`, { status });
  return response.data;
}

// Deposits
export async function getAdminDeposits(params?: { status?: string; network?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/deposits', { params });
  return response.data;
}

export async function getAdminDeposit(id: string) {
  const response = await api.get(`/admin/deposits/${id}`);
  return response.data;
}

export async function transitionDeposit(id: string, status: string, reason?: string) {
  const response = await api.put(`/admin/deposits/${id}/status`, { status, reason });
  return response.data;
}

// Reports
export async function getAdminReports(params?: { status?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/reports', { params });
  return response.data;
}

export async function createReport(data: any) {
  const response = await api.post('/admin/reports', data);
  return response.data;
}

export async function submitReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/submit`);
  return response.data;
}

export async function approveReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/approve`);
  return response.data;
}

export async function publishReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/publish`);
  return response.data;
}

// Payouts
export async function getAdminPayouts(params?: { status?: string; batch_id?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/payouts', { params });
  return response.data;
}

export async function createPayout(data: { deposit_id: string }) {
  const response = await api.post('/admin/payouts', data);
  return response.data;
}

export async function createPayoutBatch(deposit_ids: string[]) {
  const response = await api.post('/admin/payouts/batch', { deposit_ids });
  return response.data;
}

export async function approvePayout(id: string) {
  const response = await api.put(`/admin/payouts/${id}/approve`);
  return response.data;
}

export async function recordPayoutSent(id: string, tx_hash: string) {
  const response = await api.put(`/admin/payouts/${id}/sent`, { tx_hash });
  return response.data;
}

export async function recordPayoutConfirmed(id: string) {
  const response = await api.put(`/admin/payouts/${id}/confirmed`);
  return response.data;
}

export async function recordPayoutFailed(id: string, reason: string) {
  const response = await api.put(`/admin/payouts/${id}/failed`, { reason });
  return response.data;
}

// Audit
export async function getAuditLog(params?: { actorType?: string; entityType?: string; action?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/audit', { params });
  return response.data;
}

export default api;
```

- [ ] **Step 8: Create auth provider**

`apps/admin/src/providers/auth-provider.tsx`:

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      if (pathname !== '/login') {
        router.push('/login');
      }
      setLoading(false);
      return;
    }

    getProfile()
      .then((profile) => {
        setUser(profile);
        if (pathname === '/login') {
          router.push('/');
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        if (pathname !== '/login') {
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 9: Create sidebar component**

`apps/admin/src/components/sidebar.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '\uD83D\uDCCA' },
  { href: '/users', label: 'Users', icon: '\uD83D\uDC65' },
  { href: '/deposits', label: 'Deposits', icon: '\uD83D\uDCB0' },
  { href: '/periods', label: 'Periods', icon: '\uD83D\uDCC5' },
  { href: '/reports', label: 'Reports', icon: '\uD83D\uDCCB' },
  { href: '/payouts', label: 'Payouts', icon: '\uD83D\uDCB8' },
  { href: '/audit', label: 'Audit Log', icon: '\uD83D\uDD0D' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-bg-secondary min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Admin Panel</h1>
        {user && (
          <p className="text-text-secondary text-sm mt-1">
            {user.display_name || user.username}
          </p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              pathname === item.href
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-bg-tertiary rounded-lg"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 10: Create layout**

`apps/admin/src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { AuthProvider } from '../providers/auth-provider';
import { Sidebar } from '../components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Panel — Investment Service',
  description: 'Admin panel for managing the investment service',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <AuthProvider>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 11: Create login page**

`apps/admin/src/app/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [initData, setInitData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminLogin(initData);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md p-6 bg-bg-secondary rounded-lg">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>

        {error && (
          <div className="bg-danger/20 text-danger p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Telegram InitData
            </label>
            <textarea
              value={initData}
              onChange={(e) => setInitData(e.target.value)}
              className="w-full p-3 bg-bg-tertiary rounded-lg text-text text-sm"
              placeholder="Paste your Telegram WebApp initData here..."
              rows={4}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-text-secondary text-xs mt-4">
          For development: Use Telegram WebApp initData from the Mini App or bot.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Create dashboard page**

`apps/admin/src/app/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminDeposits, getAdminUsers, getAdminPayouts, getAdminReports } from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeDeposits: 0,
    pendingReview: 0,
    pendingPayouts: 0,
    pendingReports: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminDeposits({ status: 'ACTIVE', limit: 1 }),
      getAdminDeposits({ status: 'MANUAL_REVIEW', limit: 1 }),
      getAdminPayouts({ status: 'PENDING_APPROVAL', limit: 1 }),
      getAdminReports({ status: 'PENDING_APPROVAL', limit: 1 }),
      getAdminUsers({ limit: 1 }),
    ])
      .then(([active, review, payouts, reports, users]) => {
        setStats({
          activeDeposits: active.length || 0,
          pendingReview: review.length || 0,
          pendingPayouts: payouts.length || 0,
          pendingReports: reports.length || 0,
          totalUsers: users.length || 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  const statCards = [
    { label: 'Active Deposits', value: stats.activeDeposits, href: '/deposits?status=ACTIVE', color: 'text-success' },
    { label: 'Pending Review', value: stats.pendingReview, href: '/deposits?status=MANUAL_REVIEW', color: 'text-warning' },
    { label: 'Pending Payouts', value: stats.pendingPayouts, href: '/payouts?status=PENDING_APPROVAL', color: 'text-link' },
    { label: 'Pending Reports', value: stats.pendingReports, href: '/reports?status=PENDING_APPROVAL', color: 'text-primary' },
    { label: 'Total Users', value: stats.totalUsers, href: '/users', color: 'text-text' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <div className="bg-bg-secondary rounded-lg p-6 hover:bg-bg-tertiary transition-colors">
              <div className="text-text-secondary text-sm">{stat.label}</div>
              <div className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-bg-secondary rounded-lg p-6">
        <h2 className="font-medium mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/deposits" className="text-primary text-sm hover:underline">View All Deposits</Link>
          <Link href="/payouts" className="text-primary text-sm hover:underline">View Payouts</Link>
          <Link href="/reports" className="text-primary text-sm hover:underline">View Reports</Link>
          <Link href="/periods" className="text-primary text-sm hover:underline">Manage Periods</Link>
          <Link href="/users" className="text-primary text-sm hover:underline">View Users</Link>
          <Link href="/audit" className="text-primary text-sm hover:underline">Audit Log</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 13: Commit**

```bash
git add apps/admin/
git commit -m "feat: admin panel setup with auth, sidebar, and dashboard"
```

---

### Task 2: Admin — Users + Deposits Pages

**Files:**
- Create: `apps/admin/src/app/users/page.tsx`
- Create: `apps/admin/src/app/deposits/page.tsx`
- Create: `apps/admin/src/app/deposits/[id]/page.tsx`
- Create: `apps/admin/src/components/status-badge.tsx`

- [ ] **Step 1: Create status badge component**

`apps/admin/src/components/status-badge.tsx`:

```typescript
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/20 text-success',
  CREATED: 'bg-gray-500/20 text-gray-400',
  AWAITING_TRANSFER: 'bg-warning/20 text-warning',
  DETECTED: 'bg-link/20 text-link',
  CONFIRMING: 'bg-link/20 text-link',
  CONFIRMED: 'bg-success/20 text-success',
  COMPLETED: 'bg-link/20 text-link',
  REPORT_READY: 'bg-primary/20 text-primary',
  PAYOUT_PENDING: 'bg-warning/20 text-warning',
  PAYOUT_APPROVED: 'bg-success/20 text-success',
  PAYOUT_SENT: 'bg-success/20 text-success',
  PAYOUT_CONFIRMED: 'bg-success/20 text-success',
  ON_HOLD: 'bg-warning/20 text-warning',
  MANUAL_REVIEW: 'bg-warning/20 text-warning',
  REJECTED: 'bg-danger/20 text-danger',
  CANCELLED: 'bg-danger/20 text-danger',
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PENDING_APPROVAL: 'bg-warning/20 text-warning',
  APPROVED: 'bg-success/20 text-success',
  PUBLISHED: 'bg-success/20 text-success',
  PREPARED: 'bg-gray-500/20 text-gray-400',
  SENT: 'bg-success/20 text-success',
  FAILED: 'bg-danger/20 text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
```

- [ ] **Step 2: Create users page**

`apps/admin/src/app/users/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminUsers, updateUserStatus } from '../../lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAdminUsers({ search: search || undefined, limit: 100 })
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await updateUserStatus(userId, status);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, status } : u)));
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Telegram ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-t border-gray-700">
                <td className="p-3">{user.display_name || user.username || '—'}</td>
                <td className="p-3 text-text-secondary">{user.telegram_id}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-3 text-text-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.user_id, e.target.value)}
                    className="bg-bg-tertiary text-text text-xs px-2 py-1 rounded"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No users found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create deposits page**

`apps/admin/src/app/deposits/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminDeposits } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminDeposits({ status: statusFilter || undefined, limit: 100 })
      .then(setDeposits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="AWAITING_TRANSFER">Awaiting Transfer</option>
          <option value="DETECTED">Detected</option>
          <option value="CONFIRMING">Confirming</option>
          <option value="MANUAL_REVIEW">Manual Review</option>
          <option value="COMPLETED">Completed</option>
          <option value="REPORT_READY">Report Ready</option>
          <option value="PAYOUT_PENDING">Payout Pending</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Network</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.deposit_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{d.deposit_id.slice(0, 8)}...</td>
                <td className="p-3">{d.network} / {d.asset_symbol}</td>
                <td className="p-3">{d.confirmed_amount ? `${d.confirmed_amount} ${d.asset_symbol}` : '—'}</td>
                <td className="p-3"><StatusBadge status={d.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(d.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Link href={`/deposits/${d.deposit_id}`} className="text-primary text-xs hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {deposits.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No deposits found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create deposit detail page**

`apps/admin/src/app/deposits/[id]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminDeposit, transitionDeposit } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';

const ALL_STATUSES = [
  'CREATED', 'AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING', 'CONFIRMED',
  'ACTIVE', 'COMPLETED', 'REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED',
  'PAYOUT_SENT', 'PAYOUT_CONFIRMED', 'ON_HOLD', 'MANUAL_REVIEW', 'REJECTED', 'CANCELLED',
];

export default function AdminDepositDetailPage() {
  const params = useParams();
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (params.id) {
      getAdminDeposit(params.id as string)
        .then(setDeposit)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const handleTransition = async (status: string) => {
    try {
      const updated = await transitionDeposit(deposit.deposit_id, status, reason);
      setDeposit(updated);
      setReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Transition failed');
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!deposit) return <div className="text-danger">Deposit not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deposit {deposit.deposit_id.slice(0, 8)}...</h1>
        <StatusBadge status={deposit.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Details</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Network:</span> {deposit.network}</div>
            <div><span className="text-text-secondary">Asset:</span> {deposit.asset_symbol}</div>
            <div><span className="text-text-secondary">Amount:</span> {deposit.confirmed_amount || '—'}</div>
            <div><span className="text-text-secondary">TX Hash:</span> {deposit.tx_hash || '—'}</div>
            <div><span className="text-text-secondary">Route:</span> <span className="font-mono text-xs">{deposit.deposit_route}</span></div>
            <div><span className="text-text-secondary">Source:</span> {deposit.source_address || '—'}</div>
            <div><span className="text-text-secondary">Confirmations:</span> {deposit.confirmation_count}/{deposit.min_required_confirmations}</div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Dates</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Created:</span> {deposit.created_at ? new Date(deposit.created_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Detected:</span> {deposit.detected_at ? new Date(deposit.detected_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Confirmed:</span> {deposit.confirmed_at ? new Date(deposit.confirmed_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Activated:</span> {deposit.activated_at ? new Date(deposit.activated_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Completed:</span> {deposit.completed_at ? new Date(deposit.completed_at).toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-6">
        <h2 className="font-medium mb-3">Transition Status</h2>
        <div className="flex gap-2 mb-3">
          <select
            className="flex-1 px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
            id="status-select"
          >
            <option value="">Select target status...</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById('status-select') as HTMLSelectElement;
              if (select.value) handleTransition(select.value);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Transition
          </button>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
        />
      </div>

      <Link href="/deposits" className="text-primary text-sm hover:underline">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/ apps/admin/src/app/users/ apps/admin/src/app/deposits/
git commit -m "feat: admin users and deposits pages with status management"
```

---

### Task 3: Admin — Periods + Reports + Payouts Pages

**Files:**
- Create: `apps/admin/src/app/periods/page.tsx`
- Create: `apps/admin/src/app/reports/page.tsx`
- Create: `apps/admin/src/app/payouts/page.tsx`

- [ ] **Step 1: Create periods page**

`apps/admin/src/app/periods/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAdminPeriods, createPeriod, updatePeriodStatus } from '../../lib/api';

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    period_type: 'fixed',
    start_date: '',
    end_date: '',
    accepted_networks: 'BSC,TRON,TON',
    accepted_assets: 'USDT,USDC',
  });

  useEffect(() => {
    getAdminPeriods()
      .then(setPeriods)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPeriod = await createPeriod({
        ...formData,
        accepted_networks: formData.accepted_networks.split(',').map((s) => s.trim()),
        accepted_assets: formData.accepted_assets.split(',').map((s) => s.trim()),
      });
      setPeriods((prev) => [newPeriod, ...prev]);
      setShowForm(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create period');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updatePeriodStatus(id, status);
      setPeriods((prev) => prev.map((p) => (p.investment_period_id === id ? { ...p, status } : p)));
    } catch (err) {
      console.error('Failed to update period status:', err);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Investment Periods</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          {showForm ? 'Cancel' : '+ New Period'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-lg p-4 mb-6 space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Period title"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
              required
            />
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
              required
            />
          </div>
          <input
            type="text"
            value={formData.accepted_networks}
            onChange={(e) => setFormData({ ...formData, accepted_networks: e.target.value })}
            placeholder="Networks (comma-separated)"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
          />
          <input
            type="text"
            value={formData.accepted_assets}
            onChange={(e) => setFormData({ ...formData, accepted_assets: e.target.value })}
            placeholder="Assets (comma-separated)"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
          />
          <button type="submit" className="w-full px-4 py-2 bg-success text-white rounded-lg text-sm">
            Create Period
          </button>
        </form>
      )}

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Period</th>
              <th className="text-left p-3">Networks</th>
              <th className="text-left p-3">Assets</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.investment_period_id} className="border-t border-gray-700">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-text-secondary">
                  {new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}
                </td>
                <td className="p-3 text-text-secondary">{p.accepted_networks.join(', ')}</td>
                <td className="p-3 text-text-secondary">{p.accepted_assets.join(', ')}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    p.status === 'ACTIVE' ? 'bg-success/20 text-success' :
                    p.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' :
                    p.status === 'COMPLETED' ? 'bg-link/20 text-link' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3">
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.investment_period_id, e.target.value)}
                    className="bg-bg-tertiary text-text text-xs px-2 py-1 rounded"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="LOCKED">Locked</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {periods.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No periods found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create reports page**

`apps/admin/src/app/reports/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAdminReports, submitReport, approveReport, publishReport } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminReports({ status: statusFilter || undefined, limit: 100 })
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAction = async (reportId: string, action: 'submit' | 'approve' | 'publish') => {
    try {
      if (action === 'submit') await submitReport(reportId);
      else if (action === 'approve') await approveReport(reportId);
      else if (action === 'publish') await publishReport(reportId);

      const updated = await getAdminReports({ status: statusFilter || undefined, limit: 100 });
      setReports(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Deposit</th>
              <th className="text-left p-3">Gross</th>
              <th className="text-left p-3">Net</th>
              <th className="text-left p-3">Payout</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Generated</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.report_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{r.deposit_id.slice(0, 8)}...</td>
                <td className={`p-3 ${r.gross_result >= 0 ? 'text-success' : 'text-danger'}`}>
                  {r.gross_result >= 0 ? '+' : ''}{r.gross_result}
                </td>
                <td className={`p-3 ${r.net_result >= 0 ? 'text-success' : 'text-danger'}`}>
                  {r.net_result >= 0 ? '+' : ''}{r.net_result}
                </td>
                <td className="p-3 font-medium">{r.payout_amount}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(r.generated_at).toLocaleDateString()}</td>
                <td className="p-3 space-x-2">
                  {(r.status === 'DRAFT' || r.status === 'REVISED') && (
                    <button onClick={() => handleAction(r.report_id, 'submit')} className="text-warning text-xs hover:underline">
                      Submit
                    </button>
                  )}
                  {r.status === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleAction(r.report_id, 'approve')} className="text-success text-xs hover:underline">
                      Approve
                    </button>
                  )}
                  {r.status === 'APPROVED' && (
                    <button onClick={() => handleAction(r.report_id, 'publish')} className="text-primary text-xs hover:underline">
                      Publish
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reports.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No reports found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create payouts page**

`apps/admin/src/app/payouts/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAdminPayouts, approvePayout, recordPayoutSent, recordPayoutConfirmed, recordPayoutFailed } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminPayouts({ status: statusFilter || undefined, limit: 100 })
      .then(setPayouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAction = async (payoutId: string, action: string, txHash?: string) => {
    try {
      if (action === 'approve') await approvePayout(payoutId);
      else if (action === 'sent') {
        const hash = txHash || prompt('Enter TX hash:');
        if (!hash) return;
        await recordPayoutSent(payoutId, hash);
      }
      else if (action === 'confirmed') await recordPayoutConfirmed(payoutId);
      else if (action === 'failed') {
        const reason = prompt('Failure reason:') || 'Unknown';
        await recordPayoutFailed(payoutId, reason);
      }

      const updated = await getAdminPayouts({ status: statusFilter || undefined, limit: 100 });
      setPayouts(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Deposit</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Network</th>
              <th className="text-left p-3">To</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.payout_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{p.deposit_id.slice(0, 8)}...</td>
                <td className="p-3 font-medium">{p.amount} {p.asset_symbol}</td>
                <td className="p-3">{p.network}</td>
                <td className="p-3 font-mono text-xs">{p.destination_address.slice(0, 10)}...{p.destination_address.slice(-8)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3 space-x-2">
                  {p.status === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleAction(p.payout_id, 'approve')} className="text-success text-xs hover:underline">
                      Approve
                    </button>
                  )}
                  {p.status === 'APPROVED' && (
                    <button onClick={() => handleAction(p.payout_id, 'sent')} className="text-link text-xs hover:underline">
                      Mark Sent
                    </button>
                  )}
                  {p.status === 'SENT' && (
                    <button onClick={() => handleAction(p.payout_id, 'confirmed')} className="text-success text-xs hover:underline">
                      Confirm
                    </button>
                  )}
                  {(p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED') && (
                    <button onClick={() => handleAction(p.payout_id, 'failed')} className="text-danger text-xs hover:underline">
                      Fail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payouts.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No payouts found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/app/periods/ apps/admin/src/app/reports/ apps/admin/src/app/payouts/
git commit -m "feat: admin periods, reports, and payouts pages"
```

---

### Task 4: Admin — Audit Log Page

**Files:**
- Create: `apps/admin/src/app/audit/page.tsx`

- [ ] **Step 1: Create audit log page**

`apps/admin/src/app/audit/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAuditLog } from '../../lib/api';

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: '', action: '' });

  useEffect(() => {
    getAuditLog({
      entityType: filter.entityType || undefined,
      action: filter.action || undefined,
      limit: 100,
    })
      .then((data) => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      <div className="flex gap-3 mb-4">
        <select
          value={filter.entityType}
          onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Entity Types</option>
          <option value="User">User</option>
          <option value="Deposit">Deposit</option>
          <option value="InvestmentPeriod">Period</option>
          <option value="ProfitLossReport">Report</option>
          <option value="Payout">Payout</option>
        </select>
        <input
          type="text"
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          placeholder="Filter by action..."
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Entity</th>
              <th className="text-left p-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.audit_event_id} className="border-t border-gray-700">
                <td className="p-3 text-text-secondary whitespace-nowrap">
                  {new Date(e.event_time).toLocaleString()}
                </td>
                <td className="p-3">{e.actor_type}:{e.actor_id?.slice(0, 8) || '—'}</td>
                <td className="p-3 font-medium">{e.action}</td>
                <td className="p-3 text-text-secondary">
                  {e.entity_type}:{e.entity_id?.slice(0, 8) || '—'}
                </td>
                <td className="p-3 text-text-secondary">{e.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No audit events found</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Final commit for Plan 5**

```bash
git add apps/admin/src/app/audit/
git commit -m "feat: admin audit log page — Plan 5 complete"
```

---

## Plan 5 Summary — What's Built

| Component | Description | Status |
|---|---|---|
| Admin Panel Setup | Next.js 14 + Tailwind + auth | ✅ |
| Login Page | Telegram InitData auth | ✅ |
| Dashboard | Stats cards + quick links | ✅ |
| Sidebar | Navigation with active state | ✅ |
| Users Page | List, search, status management | ✅ |
| Deposits Page | List, filter, detail, status transitions | ✅ |
| Periods Page | Create, list, status management | ✅ |
| Reports Page | List, submit/approve/publish workflow | ✅ |
| Payouts Page | List, approve/sent/confirm/fail workflow | ✅ |
| Audit Log Page | Filtered event viewer | ✅ |

## Admin Panel Routes

```
/login              — Admin login
/                   — Dashboard
/users              — User management
/deposits           — Deposits list
/deposits/[id]      — Deposit detail + transitions
/periods            — Period management
/reports            — Report approval workflow
/payouts            — Payout workflow
/audit              — Audit log viewer
```
