'use client';

import { useAuth } from '../providers/auth-provider';
import { getInitData } from '../lib/telegram';
import { useState } from 'react';

export default function HomePage() {
  const { user, loading, error } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyAdminToken = () => {
    const initData = getInitData();
    if (initData) {
      navigator.clipboard.writeText(initData).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

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

      <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
        <button
          onClick={copyAdminToken}
          className="w-full text-sm text-center text-primary font-medium"
        >
          {copied ? '✅ Token copied!' : '📋 Copy Admin Login Token'}
        </button>
        <p className="text-text-secondary text-xs mt-1">
          Paste this token at hotweeklytrader.duckdns.org/admin/login
        </p>
      </div>

      <nav className="space-y-3">
        <a href="/deposits" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">My Deposits</div>
          <div className="text-text-secondary text-sm">View and track your deposits</div>
        </a>

        <a href="/create-deposit" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">New Deposit</div>
          <div className="text-text-secondary text-sm">Create a new deposit</div>
        </a>

        <a href="/notifications" className="block p-4 bg-bg-secondary rounded-lg">
          <div className="font-medium">Notifications</div>
          <div className="text-text-secondary text-sm">View your notifications</div>
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
