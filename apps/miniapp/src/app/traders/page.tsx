'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { StatusBadge } from '../../components/status-badge';
import { useLanguage } from '../../providers/language-provider';
import { getTraders } from '../../lib/api';

function getTraderLabel(trader: any) {
  return trader.display_name || trader.nickname || trader.trader_name || trader.slug || trader.name || trader.trader_id;
}

function getTraderSubtitle(trader: any, fallback: string) {
  return trader.short_description || trader.description || trader.summary || fallback;
}

export default function TradersPage() {
  const { t } = useLanguage();
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTraders()
      .then((nextTraders) => setTraders(Array.isArray(nextTraders) ? nextTraders : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppScreen activeTab="trade">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{t('home.traders')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('home.traders')}</h1>
              <p className="mt-2 text-sm text-slate-400">{t('home.newDepSub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 space-y-3">
        {loading ? (
          <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 text-sm text-slate-400">{t('common.loading')}</div>
        ) : traders.length === 0 ? (
          <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 text-sm text-slate-400">{t('common.noData')}</div>
        ) : (
          traders.map((trader) => (
            <div
              key={trader.trader_id}
              className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-100">{getTraderLabel(trader)}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {getTraderSubtitle(trader, t('home.myDepSub'))}
                  </div>
                </div>
                {trader.status ? <StatusBadge status={trader.status} /> : null}
              </div>

              <Link
                href={`/create-deposit?trader_id=${trader.trader_id}`}
                className="mt-4 block rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100"
              >
                {t('home.newDep')}
              </Link>
            </div>
          ))
        )}
      </div>
    </AppScreen>
  );
}
