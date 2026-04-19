'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';
import { Sidebar } from './sidebar';
import { getAdminToken } from '../lib/admin-session.js';

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isLoginPage = pathname === '/login';
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoginPage || typeof window === 'undefined') {
      setHasToken(null);
      return;
    }

    const token = getAdminToken(localStorage);
    const tokenPresent = Boolean(token);
    setHasToken(tokenPresent);

    if (!tokenPresent) {
      router.replace('/login');
    }
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-text-secondary">
          {hasToken === false ? 'Redirecting to login...' : 'Loading...'}
        </div>
      </main>
    );
  }

  if (!user) {
    return <main className="min-h-screen" />;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
