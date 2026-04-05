'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminLogin, clearAdminSession, getProfile } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';
import { waitForTelegramInitData } from '../lib/telegram';

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

const ADMIN_HOME_PATH = '/';
const ADMIN_LOGIN_PATH = '/login';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const adminToken = localStorage.getItem('admin_token');
      const userToken = localStorage.getItem('auth_token');

      if (!adminToken && userToken) {
        localStorage.setItem('admin_token', userToken);
      }

      const initData = !localStorage.getItem('admin_token')
        ? await waitForTelegramInitData()
        : '';

      if (!localStorage.getItem('admin_token') && initData) {
        await adminLogin(initData);
      }
    };

    bootstrapAuth()
      .catch(() => {
        clearAdminSession();
      })
      .finally(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          if (pathname !== ADMIN_LOGIN_PATH) {
            router.push(ADMIN_LOGIN_PATH);
          }
          setLoading(false);
          return;
        }

        getProfile()
          .then((profile) => {
            setUser(profile);
            if (pathname === ADMIN_LOGIN_PATH) {
              router.push(ADMIN_HOME_PATH);
            }
          })
          .catch(() => {
            clearAdminSession();
            if (pathname !== ADMIN_LOGIN_PATH) {
              router.push(ADMIN_LOGIN_PATH);
            }
          })
          .finally(() => setLoading(false));
      });
  }, [pathname, router]);

  const logout = () => {
    clearAdminSession();
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
