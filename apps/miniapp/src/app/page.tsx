'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppScreen } from '../components/app-screen';
import { BrandBellLink } from '../components/brand-bell-link';
import { LanguageSwitch } from '../components/language-switch';
import { FluxIcon, VectorIcon } from '../components/icons';
import { StatusBadge } from '../components/status-badge';
import { useAuth } from '../providers/auth-provider';
import { useLanguage } from '../providers/language-provider';
import { getDeposits, getPeriods, getTraders } from '../lib/api';

function pickLatestDeposit(deposits: any[]) {
  return [...(Array.isArray(deposits) ? deposits : [])]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] || null;
}

function getLocalizedPeriodLabel(period: any, language: string) {
  if (!period) {
    return language === 'ru' ? 'Период еще не назначен' : 'Period not assigned yet';
  }

  return period.label || period.period_name || period.name || period.title || period.investment_period_id;
}

function getTraderLabel(trader: any, language: string) {
  if (!trader) {
    return language === 'ru' ? 'Алгоритм не назначен' : 'Algorithm not assigned';
  }

  return trader.display_name || trader.nickname || trader.trader_name || trader.slug || trader.name || trader.trader_id;
}

export default function HomePage() {
  const { user, loading, error } = useAuth();
  const { t, language } = useLanguage();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [traders, setTraders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getDeposits().catch(() => []),
      getPeriods().catch(() => []),
      getTraders().catch(() => []),
    ]).then(([nextDeposits, nextPeriods, nextTraders]) => {
      setDeposits(Array.isArray(nextDeposits) ? nextDeposits : []);
      setPeriods(Array.isArray(nextPeriods) ? nextPeriods : []);
      setTraders(Array.isArray(nextTraders) ? nextTraders : []);
    });
  }, []);

  const isRussian = language === 'ru';
  const heroRobotClassName = language === 'ru' ? 'translate-y-1 -translate-x-4' : 'translate-y-0 -translate-x-3';
  const heroTextClassName = isRussian ? 'max-w-[13.5rem]' : 'max-w-[15rem]';
  const heroTitleClassName = isRussian ? 'text-[1.78rem]' : 'text-3xl';

  const summaryDeposit = useMemo(() => pickLatestDeposit(deposits), [deposits]);
  const summaryPeriod = summaryDeposit
    ? periods.find((period) => period.investment_period_id === summaryDeposit.investment_period_id) || null
    : null;
  const summaryTrader = summaryDeposit
    ? traders.find((trader) => trader.trader_id === summaryDeposit.trader_id) || null
    : null;

  return (
    <AppScreen activeTab="home">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-slate-900/70 px-4 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
              <FluxIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">Deplexapp</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[32px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(10,26,34,0.98),rgba(7,17,23,0.94))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className={heroTextClassName}>
              <h1 className={`font-bold leading-[1.02] text-slate-50 ${heroTitleClassName}`}>{t('home.title')}</h1>
              <p className="mt-3 text-sm text-slate-400">
                {t('home.welcome', { name: user?.display_name || user?.username || 'Trader' })}
              </p>
            </div>

            <div className={`relative h-28 w-24 shrink-0 ${heroRobotClassName}`}>
              <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(70,195,229,0.22),rgba(70,195,229,0.02))] blur-xl" />
              <div className="absolute inset-x-3 top-2 bottom-2 rounded-[26px] border border-cyan-300/20 bg-slate-950/70" />
              <div className="absolute left-1/2 top-5 h-8 w-8 -translate-x-1/2 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
                <VectorIcon className="h-full w-full p-1.5" />
              </div>
              <div className="absolute inset-x-6 top-16 h-1 rounded-full bg-cyan-300/40" />
              <div className="absolute inset-x-5 bottom-5 h-7 rounded-[18px] border border-cyan-300/15 bg-slate-900/80" />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <Link href="/traders" className="rounded-3xl border border-cyan-300/15 bg-cyan-400/10 p-4 text-slate-50">
              <div className="text-sm font-semibold">{t('home.traders')}</div>
              <div className="mt-1 text-xs leading-5 text-cyan-100/70">{t('home.newDepSub')}</div>
            </Link>
            <Link href="/deposits" className="rounded-3xl border border-cyan-300/15 bg-slate-900/70 p-4 text-slate-50">
              <div className="text-sm font-semibold">{t('home.myDep')}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{t('home.myDepSub')}</div>
            </Link>
            <Link href="/profile" className="rounded-3xl border border-cyan-300/15 bg-slate-900/70 p-4 text-slate-50">
              <div className="text-sm font-semibold">{t('home.myProfile')}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{t('home.myProfileSub')}</div>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 text-sm text-slate-400">
          {t('common.loading')}
        </div>
      ) : error ? (
        <div className="relative z-10 mt-4 rounded-3xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : (
        <div className="relative z-10 mt-4 space-y-4">
          <section className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('home.latestDepositStatus')}</div>
                <div className="mt-1 text-base font-semibold text-slate-100">
                  {summaryDeposit ? getTraderLabel(summaryTrader, language) : t('home.depositNotCreated')}
                </div>
              </div>
              {summaryDeposit ? <StatusBadge status={summaryDeposit.status} /> : null}
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('home.currentPeriod')}</div>
                <div className="mt-2 text-sm font-medium text-slate-100">{getLocalizedPeriodLabel(summaryPeriod, language)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('home.profitLoss')}</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">0.00 USDT</div>
                </div>
                <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('home.projectedBalance')}</div>
                  <div className="mt-2 text-sm font-medium text-slate-100">0.00 USDT</div>
                </div>
              </div>
            </div>

            {summaryDeposit ? (
              <Link
                href={`/metrics/${summaryDeposit.deposit_id}`}
                className="mt-3 block rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-cyan-100"
              >
                {t('metrics.title')}
              </Link>
            ) : null}
          </section>
        </div>
      )}
    </AppScreen>
  );
}
