'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { PageBackButton } from '../../../components/page-back-button';
import { getReportByDeposit } from '../../../lib/api';
import { useLanguage } from '../../../providers/language-provider';

export default function ReportPage() {
  const { t } = useLanguage();
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.depositId) {
      getReportByDeposit(params.depositId as string)
        .then(setReport)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.depositId]);

  if (loading) return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;
  if (!report) return <div className="p-4 text-text-secondary">{t('reports.noReport')}</div>;

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref={`/deposits/${params.depositId as string}`} />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('reports.title')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('reports.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-3xl bg-bg-secondary p-4">
        <p className="mb-4 text-xs leading-5 text-text-secondary">{t('reports.referralNote')}</p>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('reports.initialDeposit')}</span>
            <span className="font-medium">{report.payout_amount - report.net_result}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('reports.grossResult')}</span>
            <span className={`font-medium ${report.gross_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.gross_result >= 0 ? '+' : ''}{report.gross_result}
            </span>
          </div>
          {report.fee_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('reports.fees')}</span>
              <span className="text-red-400">-{report.fee_amount}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3 flex justify-between">
            <span className="font-medium">{t('reports.netResult')}</span>
            <span className={`font-bold ${report.net_result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {report.net_result >= 0 ? '+' : ''}{report.net_result}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-bold">{t('reports.payoutAmount')}</span>
            <span className="font-bold text-primary">{report.payout_amount}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 text-text-secondary text-xs space-y-1">
        <div>Status: {report.status}</div>
        <div>Generated: {new Date(report.generated_at).toLocaleString()}</div>
        {report.approved_at && <div>Approved: {new Date(report.approved_at).toLocaleString()}</div>}
        {report.published_at && <div>Published: {new Date(report.published_at).toLocaleString()}</div>}
      </div>

      <Link href="/referrals" className="relative z-10 mt-6 block text-center text-primary">
        {t('reports.openReferralBalances')}
      </Link>
    </AppScreen>
  );
}
