'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      if (pathname !== '/login') {
        router.push('/login');
      }
      setLoading(false);
      return;
    }

    getProfile()
      .then((profile) => {
        setUser(profile);
        if (pathname === '/login') {
          router.push('/');
        }
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        if (pathname !== '/login') {
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
    router.push('/login');
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
