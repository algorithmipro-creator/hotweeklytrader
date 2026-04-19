'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { PageBackButton } from '../../../components/page-back-button';
import { StatusBadge } from '../../../components/status-badge';
import { useLanguage } from '../../../providers/language-provider';
import { getDeposit, getDepositLiveMetrics, getPeriods, getTraders } from '../../../lib/api';

function getTraderCatalog() {
  return [];
}

function mergeApiTraderCatalog(apiTraders: any[]) {
  return Array.isArray(apiTraders) ? apiTraders : [];
}

function buildDepositMetricsSummary(
  deposit: { deposit_id: string; trader_id?: string | null; investment_period_id?: string | null },
  period: { investment_period_id?: string | null; period_name?: string | null; name?: string | null; label?: string | null } | null,
  trader: { trader_id?: string | null; trader_name?: string | null; display_name?: string | null; nickname?: string | null; name?: string | null } | null,
) {
  return {
    depositId: deposit.deposit_id,
    traderName: trader?.display_name || trader?.trader_name || trader?.nickname || trader?.name || 'Unknown trader',
    periodLabel: period?.label || period?.period_name || period?.name || period?.investment_period_id || 'Unknown period',
  };
}

export default function DepositMetricsPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const [deposit, setDeposit] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [traders, setTraders] = useState<any[]>(() => getTraderCatalog());
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.depositId) {
      return;
    }

    Promise.all([
      getDeposit(params.depositId as string),
      getDepositLiveMetrics(params.depositId as string).catch(() => null),
      getPeriods().catch(() => []),
      getTraders()
        .then((apiTraders) => mergeApiTraderCatalog(apiTraders))
        .catch(() => getTraderCatalog()),
    ])
      .then(([nextDeposit, nextLiveMetrics, nextPeriods, nextTraders]) => {
        setDeposit(nextDeposit);
        setLiveMetrics(nextLiveMetrics);
        setPeriods(Array.isArray(nextPeriods) ? nextPeriods : []);
        setTraders(Array.isArray(nextTraders) ? nextTraders : getTraderCatalog());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.depositId]);

  if (loading) {
    return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;
  }

  if (!deposit) {
    return <div className="p-4 text-red-400">{t('depositDetail.notFound')}</div>;
  }

  const period = periods.find((item) => item.investment_period_id === deposit.investment_period_id) || null;
  const trader = traders.find((item) => item.trader_id === deposit.trader_id) || null;
  const summary = buildDepositMetricsSummary(deposit, period, trader);

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref={`/deposits/${deposit.deposit_id}`} />
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(14,29,36,0.96),rgba(8,18,24,0.92))] p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">{t('metrics.kicker')}</p>
          <h1 className="text-3xl font-bold leading-[1.02] text-slate-50">{t('metrics.title')}</h1>
          <div className="mt-3">
            <div className="inline-flex rounded-full border border-white/10 bg-slate-950/35 px-1.5 py-1 backdrop-blur-sm">
              <StatusBadge status={deposit.status} />
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">{t('metrics.subtitle')}</p>
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('common.status')}</span>
            <StatusBadge status={deposit.status} />
          </div>
          <div className="flex justify-between rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('metrics.trader')}</span>
            <strong className="text-slate-100">{summary.traderName}</strong>
          </div>
          <div className="flex justify-between rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('metrics.period')}</span>
            <strong className="text-slate-100">{summary.periodLabel}</strong>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between rounded-2xl border border-cyan-300/12 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('home.profitLoss')}</span>
            <strong className="text-slate-100">
              {liveMetrics ? `${liveMetrics.profit_percent}%` : t('metrics.emptyValue')}
            </strong>
          </div>
          <div className="flex justify-between rounded-2xl border border-cyan-300/12 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('metrics.assistantTrades')}</span>
            <strong className="text-slate-100">
              {liveMetrics ? String(liveMetrics.trade_count) : t('metrics.emptyValue')}
            </strong>
          </div>
          <div className="flex justify-between rounded-2xl border border-cyan-300/12 bg-slate-950/70 px-4 py-3">
            <span className="text-slate-400">{t('metrics.winRate')}</span>
            <strong className="text-slate-100">
              {liveMetrics ? `${liveMetrics.win_rate}%` : t('metrics.emptyValue')}
            </strong>
          </div>
        </div>
      </div>
    </AppScreen>
  );
}
