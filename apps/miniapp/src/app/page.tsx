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
