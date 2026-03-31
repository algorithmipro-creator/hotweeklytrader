'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPayoutsByDeposit } from '../../../lib/api';
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
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Payouts</h1>

      {payouts.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p>No payouts yet.</p>
          <p className="text-sm mt-2">Payouts will appear here once the trading period is complete.</p>
        </div>
      ) : (
        <div className="space-y-3">
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

      <Link href="/deposits" className="block text-center text-primary mt-6">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
