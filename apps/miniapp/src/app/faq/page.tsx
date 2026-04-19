'use client';

import Link from 'next/link';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { useLanguage } from '../../providers/language-provider';

export default function FaqPage() {
  const { t } = useLanguage();

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];

  return (
    <AppScreen activeTab="help">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('faq.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('faq.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{t('faq.subtitle')}</p>
      </div>

      <div className="relative z-10 mt-4 space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <h3 className="font-medium text-slate-100">{faq.q}</h3>
            <p className="mt-2 text-sm text-slate-400">{faq.a}</p>
          </div>
        ))}
      </div>
    </AppScreen>
  );
}
