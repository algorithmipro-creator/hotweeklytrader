'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { useLanguage } from '../../providers/language-provider';
import { getNotifications, markNotificationRead } from '../../lib/api';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, delivery_status: 'READ' } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  if (loading) return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('notifications.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('notifications.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{t('notifications.subtitle')}</p>
      </div>

      {notifications.length === 0 ? (
        <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 px-5 py-10 text-center text-text-secondary">
          <p className="text-base font-semibold text-slate-100">{t('notifications.emptyTitle')}</p>
          <p className="mt-2 text-sm text-slate-400">{t('notifications.emptySub')}</p>
        </div>
      ) : (
        <div className="relative z-10 mt-4 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              className={`rounded-3xl border p-4 ${
                n.delivery_status === 'READ'
                  ? 'border-cyan-300/10 bg-slate-950/60'
                  : 'border-cyan-300/20 bg-cyan-400/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-slate-100">{n.title}</span>
                {n.delivery_status !== 'READ' && (
                  <button
                    onClick={() => handleRead(n.notification_id)}
                    className="text-xs text-cyan-200"
                  >
                    {t('common.markRead')}
                  </button>
                )}
              </div>
              <p className="text-text-secondary text-sm">{n.body}</p>
              <div className="text-text-secondary text-xs mt-1">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppScreen>
  );
}
