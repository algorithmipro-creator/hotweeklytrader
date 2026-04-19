'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin, adminPasswordLogin } from '../../lib/api';
import { getTelegramInitData, waitForTelegramInitData } from '../../lib/telegram';
import { getAdminToken } from '../../lib/admin-session.js';
import { shouldSkipTelegramAutoLogin } from '../../lib/login-flow.js';

const ADMIN_HOME_PATH = '/';

export default function LoginPage() {
  const router = useRouter();
  const [initData, setInitData] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loginFromTelegram = async () => {
      const token = getAdminToken(localStorage);
      if (shouldSkipTelegramAutoLogin(token)) {
        return;
      }

      const immediateInitData = getTelegramInitData();
      const resolvedInitData = immediateInitData || await waitForTelegramInitData();

      if (!resolvedInitData || cancelled) {
        return;
      }

      setInitData(resolvedInitData);
      setLoading(true);
      setError(null);

      try {
        await adminLogin(resolvedInitData);
        router.push(ADMIN_HOME_PATH);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Authentication failed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loginFromTelegram();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminPasswordLogin(login, password);
      router.push(ADMIN_HOME_PATH);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminLogin(initData);
      router.push(ADMIN_HOME_PATH);
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

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-login" className="block text-sm text-text-secondary mb-1">
              Admin Login
            </label>
            <input
              id="admin-login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full p-3 bg-bg-tertiary rounded-lg text-text text-sm"
              placeholder="owner"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm text-text-secondary mb-1">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-bg-tertiary rounded-lg text-text text-sm"
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login with Password'}
          </button>
        </form>

        <div className="my-5 border-t border-gray-700" />

        <form onSubmit={handleTelegramSubmit} className="space-y-4">
          <div>
            <label htmlFor="telegram-init-data" className="block text-sm text-text-secondary mb-1">
              Telegram InitData
            </label>
            <textarea
              id="telegram-init-data"
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
            className="w-full p-3 bg-bg-tertiary text-text rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login with Telegram InitData'}
          </button>
        </form>

        <p className="text-text-secondary text-xs mt-4">
          Password login works in a normal browser. Telegram auto-login still works when the page is opened inside Telegram WebApp context.
        </p>
      </div>
    </div>
  );
}
