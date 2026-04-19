'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { PageBackButton } from '../../../components/page-back-button';
import { getReferralProfile } from '../../../lib/api';
import { useLanguage } from '../../../providers/language-provider';

type ReferralProfile = {
  referral_code: string;
  referral_payout_preference: string;
  held_referral_balances: Record<string, number>;
  reward_history: Array<{
    referral_reward_id: string;
    source_deposit_id: string;
    referral_level: number;
    reward_type: string;
    reward_amount: number;
    created_at: string;
    source_user: {
      user_id: string;
      username: string | null;
      display_name: string | null;
    };
    source_deposit: {
      deposit_id: string;
      network: string;
      confirmed_amount: number;
      created_at: string;
    } | null;
  }>;
};

function formatMoney(value: number) {
  return `${value.toFixed(2)} USDT`;
}

export default function ProfileReferralsPage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReferralProfile()
      .then((nextProfile) => setProfile(nextProfile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const totalHeld = useMemo(() => {
    if (!profile) {
      return 0;
    }

    return Object.values(profile.held_referral_balances || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  }, [profile]);

  if (loading) {
    return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;
  }

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref="/profile" />
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('profile.referralsTitle')}</div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 space-y-4">
        <header className="rounded-2xl bg-bg-secondary p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">{t('profile.referralsTitle')}</p>
          <h1 className="mt-2 text-2xl font-bold">{t('referrals.title')}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t('referrals.subtitle')}</p>
        </header>

        <section className="space-y-3">
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('profile.heldReferralBalances')}</div>
            <div className="mt-1 text-xl font-semibold">{formatMoney(totalHeld)}</div>
          </div>
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('profile.referralPayoutPreference')}</div>
            <div className="mt-1 text-base font-medium">{profile?.referral_payout_preference || t('common.noData')}</div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="font-medium">{t('referrals.historyTitle')}</div>
            <p className="mt-2 text-sm text-text-secondary">{t('referrals.historySub')}</p>
          </div>
          {profile?.reward_history?.length ? (
            profile.reward_history.map((reward) => (
              <div key={reward.referral_reward_id} className="rounded-2xl bg-bg-secondary p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{reward.source_user.display_name || reward.source_user.username || reward.source_user.user_id}</div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {t('referrals.rowMeta', {
                        level: reward.referral_level,
                        type: reward.reward_type,
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-text">{formatMoney(reward.reward_amount)}</div>
                    <div className="mt-1 text-xs text-text-secondary">{new Date(reward.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-text-secondary">
                  {reward.source_deposit_id}
                  {reward.source_deposit ? ` · ${reward.source_deposit.network} · ${formatMoney(reward.source_deposit.confirmed_amount)}` : ''}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-bg-secondary p-4 text-sm text-text-secondary">{t('common.noData')}</div>
          )}
        </section>
      </div>
    </AppScreen>
  );
}
