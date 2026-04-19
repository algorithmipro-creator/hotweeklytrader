'use client';

import React, {
  createContext, useContext, useState, useEffect, ReactNode, useRef,
} from 'react';
import { authenticateTelegram, getProfile } from '../lib/api';
import {
  getInitData,
  getReferralCodeFromUrl,
  getStartParam,
  initTelegramWebApp,
  waitForTelegramInitData,
} from '../lib/telegram';
import { useLanguage } from './language-provider';

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
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authStartedRef = useRef(false);

  useEffect(() => {
    if (authStartedRef.current) {
      return;
    }

    authStartedRef.current = true;

    async function authenticate() {
      try {
        initTelegramWebApp();
        const initData = getInitData() || await waitForTelegramInitData();
        const startParam = getStartParam();
        const referralCodeFromStartParam = startParam?.startsWith('ref_') ? startParam.slice(4) : null;
        const referralCode = getReferralCodeFromUrl() || referralCodeFromStartParam;

        if (!initData) {
          setError(t('auth.telegramUnavailable'));
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

        const result = await authenticateTelegram(initData, referralCode);
        setUser(result.user);
      } catch (err: any) {
        setError(err.response?.data?.message || t('auth.failed'));
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
