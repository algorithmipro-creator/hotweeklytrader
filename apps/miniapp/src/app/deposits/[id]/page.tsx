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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      getDeposit(params.id as string)
        .then(setDeposit)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const copyAddress = () => {
    if (deposit?.deposit_address) {
      navigator.clipboard.writeText(deposit.deposit_address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

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

  const isAwaitingTransfer = deposit.status === 'AWAITING_TRANSFER';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Deposit Details</h1>
        <StatusBadge status={deposit.status} />
      </div>

      {isAwaitingTransfer && deposit.deposit_address && (
        <div className="bg-bg-secondary rounded-lg p-4 mb-4 border-2 border-primary/30">
          <h2 className="font-medium mb-2 text-primary">Send {deposit.asset_symbol} to this address</h2>
          <p className="text-text-secondary text-xs mb-3">
            Network: {deposit.network} — Send only {deposit.asset_symbol} on {deposit.network} network
          </p>
          <div className="bg-bg-tertiary rounded-lg p-3 flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-link break-all">{deposit.deposit_address}</span>
            <button
              onClick={copyAddress}
              className="shrink-0 px-3 py-1.5 bg-primary text-primary-text rounded-lg text-xs font-medium"
            >
              {copied ? '✅ Copied' : '📋 Copy'}
            </button>
          </div>
          <p className="text-text-secondary text-xs mt-3">
            ⚠️ Send only {deposit.asset_symbol} via {deposit.network} network. Sending other tokens may result in loss of funds.
          </p>
        </div>
      )}

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

      {(deposit.status === 'REPORT_READY' || deposit.status === 'PAYOUT_PENDING' ||
        deposit.status === 'PAYOUT_APPROVED' || deposit.status === 'PAYOUT_SENT' ||
        deposit.status === 'PAYOUT_CONFIRMED') && (
        <div className="bg-bg-secondary rounded-lg p-4 mb-4">
          <h2 className="font-medium mb-3">Actions</h2>
          <div className="space-y-2">
            <Link href={`/reports/${deposit.deposit_id}`} className="block text-primary text-sm">
              View Report &rarr;
            </Link>
            <Link href={`/payouts/${deposit.deposit_id}`} className="block text-primary text-sm">
              View Payouts &rarr;
            </Link>
          </div>
        </div>
      )}

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
