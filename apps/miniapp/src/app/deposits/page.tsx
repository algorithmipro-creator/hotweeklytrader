'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDeposits } from '../../lib/api';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { DepositCard } from '../../components/deposit-card';
import { PageBackButton } from '../../components/page-back-button';
import { useLanguage } from '../../providers/language-provider';

export default function DepositsPage() {
  const { t } = useLanguage();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeposits()
      .then(setDeposits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppScreen activeTab="trade">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" forceFallback />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('deposits.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('deposits.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{t('deposits.subtitle')}</p>
        <Link href="/create-deposit" className="mt-4 inline-flex rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100">
          {t('deposits.openNew')}
        </Link>
      </div>

      {loading ? (
        <div className="relative z-10 mt-4 text-text-secondary">{t('common.loading')}</div>
      ) : deposits.length === 0 ? (
        <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 px-5 py-10 text-center text-text-secondary">
          <p className="mb-2 text-lg font-semibold text-slate-100">{t('deposits.emptyTitle')}</p>
          <p className="mb-4 text-sm text-slate-400">{t('deposits.emptySub')}</p>
          <Link href="/create-deposit" className="text-primary">
            {t('deposits.openNew')} &rarr;
          </Link>
        </div>
      ) : (
        <div className="relative z-10 mt-4">
          {deposits.map((deposit) => (
            <DepositCard key={deposit.deposit_id} deposit={deposit} />
          ))}
        </div>
      )}
    </AppScreen>
  );
}
