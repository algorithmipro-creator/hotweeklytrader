'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { PageBackButton } from '../../../components/page-back-button';
import { getReferralTeam } from '../../../lib/api';
import { useLanguage } from '../../../providers/language-provider';

type ReferralTeam = {
  referral_code: string;
  referral_link: string;
  summary: {
    team_count: number;
    level_one_count: number;
    level_two_count: number;
    active_count: number;
  };
  members: Array<{
    user_id: string;
    username: string | null;
    display_name: string | null;
    level: 1 | 2;
    joined_at: string;
    is_active: boolean;
    deposit_count: number;
    confirmed_total_usdt: number;
  }>;
};

export default function ProfileTeamPage() {
  const { t } = useLanguage();
  const [team, setTeam] = useState<ReferralTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    getReferralTeam()
      .then((nextTeam) => setTeam(nextTeam))
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!team?.referral_link) {
      return;
    }

    try {
      await navigator.clipboard.writeText(team.referral_link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    window.setTimeout(() => setCopyState('idle'), 2500);
  };

  if (loading) {
    return <div className="p-4 text-text-secondary">{t('team.loading')}</div>;
  }

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref="/profile" />
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('team.kicker')}</div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 space-y-4">
        <header className="rounded-2xl bg-bg-secondary p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">{t('team.kicker')}</p>
          <h1 className="mt-2 text-2xl font-bold">{t('team.title')}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t('team.subtitle')}</p>
        </header>

        <section className="rounded-2xl bg-bg-secondary p-4">
          <div className="text-sm text-text-secondary">{t('team.referralLinkTitle')}</div>
          <div className="mt-2 break-all text-sm text-link">{team?.referral_link || t('common.noData')}</div>
          <div className="mt-3 text-sm text-text-secondary">
            {t('team.referralCode')}: <span className="text-text">{team?.referral_code || t('common.noData')}</span>
          </div>
          <button onClick={handleCopy} className="mt-4 rounded-xl bg-primary px-4 py-3 font-medium text-primary-text">
            {copyState === 'copied' ? t('team.linkCopied') : t('team.copyLink')}
          </button>
          {copyState === 'failed' ? <p className="mt-2 text-sm text-red-300">{t('team.copyFailed')}</p> : null}
        </section>

        <section className="grid gap-3">
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('team.teamCount')}</div>
            <div className="mt-1 text-lg font-semibold">{team?.summary.team_count ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('team.levelOneCount')}</div>
            <div className="mt-1 text-lg font-semibold">{team?.summary.level_one_count ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('team.levelTwoCount')}</div>
            <div className="mt-1 text-lg font-semibold">{team?.summary.level_two_count ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="text-sm text-text-secondary">{t('team.activeCount')}</div>
            <div className="mt-1 text-lg font-semibold">{team?.summary.active_count ?? 0}</div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl bg-bg-secondary p-4">
            <div className="font-medium">{t('team.previewTitle')}</div>
            <p className="mt-2 text-sm text-text-secondary">{t('team.previewNote')}</p>
          </div>

          {team?.members?.length ? (
            team.members.map((member) => (
              <div key={member.user_id} className="rounded-2xl bg-bg-secondary p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{member.display_name || member.username || member.user_id}</div>
                    <div className="mt-1 text-xs text-text-secondary">{t('team.levelLabel', { level: member.level })}</div>
                  </div>
                  <div className="text-right text-xs text-text-secondary">
                    <div>{t('team.previewRegistered')}: {new Date(member.joined_at).toLocaleDateString()}</div>
                    <div>{t('team.previewActive')}: {member.is_active ? t('common.live') : t('common.noData')}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm text-text-secondary">
                  {t('deposits.title')}: {member.deposit_count} · {t('common.amount')}: {member.confirmed_total_usdt.toFixed(2)} USDT
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-bg-secondary p-4 text-sm text-text-secondary">{t('team.emptyMembers')}</div>
          )}
        </section>
      </div>
    </AppScreen>
  );
}
