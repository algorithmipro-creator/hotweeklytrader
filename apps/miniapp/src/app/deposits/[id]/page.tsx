'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getDeposit } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';
import { Timeline } from '../../../components/timeline';

export default function DepositDetailPage() {
  const params = useParams();
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      getDeposit(params.id as string)
        .then(setDeposit)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-4 text-text-secondary">Loading...</div>;
  }

  if (!deposit) {
    return <div className="p-4 text-red-400">Deposit not found</div>;
  }

  const timelineEvents = [
    { label: 'Deposit Created', date: deposit.created_at, completed: true },
    { label: 'Transfer Detected', date: deposit.detected_at, completed: !!deposit.detected_at },
    { label: 'Confirmed', date: deposit.confirmed_at, completed: !!deposit.confirmed_at },
    { label: 'Active', date: deposit.activated_at, completed: !!deposit.activated_at },
    { label: 'Completed', date: deposit.completed_at, completed: !!deposit.completed_at },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Deposit Details</h1>
        <StatusBadge status={deposit.status} />
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-text-secondary">Network</div>
            <div className="font-medium">{deposit.network}</div>
          </div>
          <div>
            <div className="text-text-secondary">Asset</div>
            <div className="font-medium">{deposit.asset_symbol}</div>
          </div>
          {deposit.confirmed_amount && (
            <div>
              <div className="text-text-secondary">Amount</div>
              <div className="font-medium">{deposit.confirmed_amount} {deposit.asset_symbol}</div>
            </div>
          )}
          {deposit.tx_hash && (
            <div>
              <div className="text-text-secondary">TX Hash</div>
              <div className="font-medium text-link truncate">{deposit.tx_hash}</div>
            </div>
          )}
          {deposit.activated_at && (
            <div>
              <div className="text-text-secondary">Start Date</div>
              <div className="font-medium">{new Date(deposit.activated_at).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-4">
        <h2 className="font-medium mb-3">Status Timeline</h2>
        <Timeline events={timelineEvents} />
      </div>

      {deposit.status_reason && (
        <div className="bg-bg-secondary rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-2">Note</h2>
          <p className="text-text-secondary text-sm">{deposit.status_reason}</p>
        </div>
      )}

      <Link href="/deposits" className="block text-center text-primary">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
