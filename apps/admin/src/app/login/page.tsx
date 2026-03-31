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
