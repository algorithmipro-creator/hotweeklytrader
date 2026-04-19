'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getPayoutsByDeposit } from '../../../lib/api';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { PageBackButton } from '../../../components/page-back-button';
import { StatusBadge } from '../../../components/status-badge';

export default function PayoutsPage() {
  const params = useParams();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.depositId) {
      getPayoutsByDeposit(params.depositId as string)
        .then(setPayouts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.depositId]);

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PageBackButton fallbackHref={`/deposits/${params.depositId as string}`} />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Payouts</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">Payouts</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      {payouts.length === 0 ? (
        <div className="relative z-10 py-8 text-center text-text-secondary">
          <p>No payouts yet.</p>
          <p className="text-sm mt-2">Payouts will appear here once the trading period is complete.</p>
        </div>
      ) : (
        <div className="relative z-10 mt-4 space-y-3">
          {payouts.map((payout) => (
            <div key={payout.payout_id} className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{payout.amount} {payout.asset_symbol}</span>
                <StatusBadge status={payout.status} />
              </div>

              <div className="text-text-secondary text-sm space-y-1">
                <div>Network: {payout.network}</div>
                <div>To: {payout.destination_address.slice(0, 10)}...{payout.destination_address.slice(-8)}</div>
                {payout.tx_hash && (
                  <div className="text-link truncate">TX: {payout.tx_hash}</div>
                )}
                {payout.sent_at && (
                  <div>Sent: {new Date(payout.sent_at).toLocaleString()}</div>
                )}
                {payout.failure_reason && (
                  <div className="text-red-400">Reason: {payout.failure_reason}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppScreen>
  );
}
