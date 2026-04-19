'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { useAuth } from '../../providers/auth-provider';
import { useLanguage } from '../../providers/language-provider';
import { getReferralProfile, getReferralTeam } from '../../lib/api';

type ReferralProfile = {
  referral_payout_preference: string;
  held_referral_balances: Record<string, number>;
  reward_history: Array<{ reward_amount: number }>;
};

type ReferralTeam = {
  summary: {
    team_count: number;
  };
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} USDT`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [team, setTeam] = useState<ReferralTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getReferralProfile().catch(() => null),
      getReferralTeam().catch(() => null),
    ])
      .then(([nextProfile, nextTeam]) => {
        setProfile(nextProfile);
        setTeam(nextTeam);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalHeldReferralBalance = useMemo(() => {
    if (!profile) {
      return 0;
    }

    return Object.values(profile.held_referral_balances || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  }, [profile]);

  const historyCount = profile?.reward_history?.length ?? 0;

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref="/" />
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('common.profile')}</div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 space-y-4">
        <header className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-5 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/70">{t('common.profile')}</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('profile.title')}</h1>
          <p className="mt-2 text-sm text-slate-300">
            {user?.display_name || user?.username || 'User'}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-400">{t('profile.subtitle')}</p>
        </header>

        <section className="grid gap-3">
          <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
            <div className="text-sm text-slate-400">{t('profile.heldReferralBalances')}</div>
            <div className="mt-1 text-xl font-semibold text-slate-100">{formatMoney(totalHeldReferralBalance)}</div>
          </div>
          <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
            <div className="text-sm text-slate-400">{t('profile.referralPayoutPreference')}</div>
            <div className="mt-1 text-base font-medium text-slate-100">{profile?.referral_payout_preference || t('common.noData')}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/70 p-4">
              <div className="text-sm text-slate-400">{t('profile.referralHistoryCount')}</div>
              <div className="mt-1 text-base font-medium text-slate-100">
                {loading ? t('common.loading') : String(historyCount)}
              </div>
            </div>
            <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/70 p-4">
              <div className="text-sm text-slate-400">{t('team.teamCount')}</div>
              <div className="mt-1 text-base font-medium text-slate-100">
                {loading ? t('common.loading') : String(team?.summary.team_count ?? 0)}
              </div>
            </div>
          </div>
        </section>

        <nav className="space-y-3">
          <Link href="/profile/addresses" className="block rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
            <div className="font-medium text-slate-100">{t('profile.addressesTitle')}</div>
            <div className="mt-1 text-sm text-slate-400">{t('profile.addressesSub')}</div>
          </Link>
          <Link href="/profile/team" className="block rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
            <div className="font-medium text-slate-100">{t('profile.teamTitle')}</div>
            <div className="mt-1 text-sm text-slate-400">{t('profile.teamSub')}</div>
          </Link>
          <Link href="/profile/referrals" className="block rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4 shadow-[0_16px_35px_rgba(0,0,0,0.28)]">
            <div className="font-medium text-slate-100">{t('profile.referralsTitle')}</div>
            <div className="mt-1 text-sm text-slate-400">{t('profile.referralsSub')}</div>
          </Link>
        </nav>
      </div>
    </AppScreen>
  );
}
