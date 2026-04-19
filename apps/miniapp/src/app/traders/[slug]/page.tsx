'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { ArrowLeftIcon } from '../../../components/icons';
import { MonitorBotIllustration } from '../../../components/monitor-bot-illustration';
import { useLanguage } from '../../../providers/language-provider';
import { getTrader as getTraderFromApi } from '../../../lib/api';
import { buildCreateDepositHref, getTraderProfile } from '../../../lib/trader-catalog';

type TraderProfile = ReturnType<typeof getTraderProfile>;

export default function TraderProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useLanguage();
  const [trader, setTrader] = useState<TraderProfile>(() => getTraderProfile(slug, null));

  useEffect(() => {
    let isMounted = true;

    setTrader(getTraderProfile(slug, null));

    getTraderFromApi(slug)
      .then((apiTrader) => {
        if (!isMounted) {
          return;
        }

        setTrader(getTraderProfile(slug, apiTrader));
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (!trader) {
    return (
      <AppScreen activeTab="trade">
        <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/traders"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 text-slate-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <BrandBellLink />
            <LanguageSwitch />
          </div>
          <div className="mt-5 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(14,29,36,0.96),rgba(8,18,24,0.92))] p-6 text-center">
            <h1 className="text-2xl font-bold text-slate-50">{t('common.noData')}</h1>
            <p className="mt-3 text-sm text-slate-400">{t('traders.searchHint')}</p>
          </div>
        </div>
      </AppScreen>
    );
  }

  return (
    <AppScreen activeTab="trade">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/traders"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 text-slate-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <BrandBellLink />
          <LanguageSwitch />
        </div>

        <div className="mt-5 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(14,29,36,0.96),rgba(8,18,24,0.92))] p-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">{t('flux.kicker')}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 sm:grid-cols-[1.05fr_0.95fr] sm:gap-4">
            <div>
              <h1 className="text-3xl font-bold leading-[1.02] text-slate-50">{trader.name}</h1>
              <p className="mt-2 text-sm text-slate-400">{trader.nickname}</p>
              <p className="mt-4 text-sm leading-6 text-slate-400">{trader.description ?? t('flux.description')}</p>
            </div>

            <MonitorBotIllustration variant="traderProfileHero" className="justify-self-end" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 grid gap-3">
        <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-cyan-200/70">{t('common.networks')}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {trader.networks.map((network: string) => (
              <span
                key={network}
                className="rounded-full border border-cyan-300/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300"
              >
                {network}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-cyan-200/70">{t('common.mode')}</div>
          <div className="mt-3 text-base font-semibold text-slate-100">
            {trader.badge === 'conservative-routing' ? t('flux.controlledAllocation') : t('traders.fastCycle')}
          </div>
          <div className="mt-2 text-sm text-slate-400">{trader.profile_title ?? t('flux.modeNote')}</div>
        </div>

        <div className="rounded-3xl border border-slate-500/15 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">{t('flux.ctaTitle')}</div>
              <div className="mt-1 text-xs text-slate-400">
                {trader.profileReady ? t('flux.ctaNote') : t('common.comingSoon')}
              </div>
            </div>
            <div
              className={`rounded-full border px-3 py-1.5 text-[11px] ${
                trader.profileReady
                  ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200'
                  : 'border-slate-500/20 bg-slate-700/30 text-slate-300'
              }`}
            >
              {trader.profileReady ? t('common.live') : t('common.comingSoon')}
            </div>
          </div>

          {trader.profileReady ? (
            <Link
              href={buildCreateDepositHref(trader.slug)}
              className="mt-4 block w-full rounded-2xl bg-[linear-gradient(135deg,#46c3e5,#2f93b6)] px-4 py-3 text-center font-semibold text-slate-50 shadow-[0_18px_34px_rgba(52,181,220,0.24)]"
            >
              {t('flux.ctaTitle')}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-4 block w-full cursor-not-allowed rounded-2xl bg-slate-600/55 px-4 py-3 text-center font-semibold text-slate-300"
            >
              {t('common.comingSoon')}
            </button>
          )}
        </div>
      </div>
    </AppScreen>
  );
}
