'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminLogin, getProfile } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';
import { waitForTelegramInitData } from '../lib/telegram';
import { clearAdminToken, ensureAdminTokenCookie, getAdminToken } from '../lib/admin-session.js';

interface User {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  role: string;
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
const ADMIN_HOME_PATH = '/';
const ADMIN_LOGIN_PATH = '/login';
const ADMIN_ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function redirectTo(path: string) {
  if (typeof window !== 'undefined') {
    window.location.replace(path);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const resolveProtectedRoute = async () => {
      const token = ensureAdminTokenCookie(localStorage) ?? getAdminToken(localStorage);

      if (!token) {
        setUser(null);
        setLoading(false);
        if (pathname !== ADMIN_LOGIN_PATH) {
          redirectTo(ADMIN_LOGIN_PATH);
        }
        return;
      }

      try {
        const profile = await getProfile();
        if (cancelled) return;

        if (!ADMIN_ALLOWED_ROLES.has(profile.role)) {
          clearAdminToken(localStorage);
          setUser(null);
          setLoading(false);
          redirectTo(ADMIN_LOGIN_PATH);
          return;
        }

        setUser(profile);
        setLoading(false);
        if (pathname === ADMIN_LOGIN_PATH) {
          redirectTo(ADMIN_HOME_PATH);
        }
      } catch {
        clearAdminToken(localStorage);
        if (cancelled) return;
        setUser(null);
        setLoading(false);
        if (pathname !== ADMIN_LOGIN_PATH) {
          redirectTo(ADMIN_LOGIN_PATH);
        }
      }
    };

    const resolveLoginRoute = async () => {
      const token = ensureAdminTokenCookie(localStorage) ?? getAdminToken(localStorage);
      if (token) {
        await resolveProtectedRoute();
        return;
      }

      try {
        const initData = await waitForTelegramInitData();
        if (!initData || cancelled) {
          setLoading(false);
          return;
        }

        await adminLogin(initData);
        if (cancelled) return;
        await resolveProtectedRoute();
      } catch {
        clearAdminToken(localStorage);
        if (cancelled) return;
        setUser(null);
        setLoading(false);
      }
    };

    setLoading(true);
    if (pathname === ADMIN_LOGIN_PATH) {
      resolveLoginRoute();
    } else {
      resolveProtectedRoute();
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const logout = () => {
    clearAdminToken(localStorage);
    setUser(null);
    router.push(ADMIN_LOGIN_PATH);
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
