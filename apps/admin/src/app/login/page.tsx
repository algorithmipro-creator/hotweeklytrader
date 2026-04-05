'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '../../lib/api';
import { getTelegramInitData, waitForTelegramInitData } from '../../lib/telegram';

const ADMIN_HOME_PATH = '/';

export default function LoginPage() {
  const router = useRouter();
  const [initData, setInitData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loginFromTelegram = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        router.push(ADMIN_HOME_PATH);
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
          setError(err.response?.data?.message || err.message || 'Authentication failed');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminLogin(initData);
      router.push(ADMIN_HOME_PATH);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
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
          Open the admin panel through the Telegram admin button for automatic login, or paste Telegram WebApp initData manually.
        </p>
      </div>
    </div>
  );
}
