'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateTelegram, getProfile } from '../lib/api';
import { getInitData } from '../lib/telegram';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function authenticate() {
      try {
        const initData = getInitData();

        if (!initData) {
          setError('Telegram Web App data not available');
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

        const result = await authenticateTelegram(initData);
        setUser(result.user);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Authentication failed');
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
