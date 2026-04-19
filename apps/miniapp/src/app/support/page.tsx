'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { useLanguage } from '../../providers/language-provider';
import { createSupportCase } from '../../lib/api';

export default function SupportPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('deposit');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createSupportCase({
        category,
        opened_reason: message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('support.failedSubmit'));
    }
  };

  return (
    <AppScreen activeTab="support">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('support.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('support.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{t('support.subtitle')}</p>
      </div>

      {error && (
        <div className="relative z-10 mt-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {submitted ? (
        <div className="relative z-10 mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-500/10 p-5 text-center">
          <p className="font-medium text-emerald-200">{t('support.messageSent')}</p>
          <p className="mt-2 text-sm text-emerald-100/80">{t('support.messageSentSub')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('support.category')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg bg-bg-secondary p-3 text-text"
            >
              <option value="deposit">{t('support.depositIssue')}</option>
              <option value="payout">{t('support.payoutIssue')}</option>
              <option value="report">{t('support.reportQuestion')}</option>
              <option value="account">{t('support.accountIssue')}</option>
              <option value="other">{t('support.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">{t('support.message')}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] w-full rounded-lg bg-bg-secondary p-3 text-text"
              placeholder={t('support.messagePlaceholder')}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary p-3 font-medium text-primary-text"
          >
            {t('support.send')}
          </button>
        </form>
      )}
    </AppScreen>
  );
}
