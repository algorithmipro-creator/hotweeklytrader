'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminDeposit, transitionDeposit } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';

const ALL_STATUSES = [
  'CREATED', 'AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING', 'CONFIRMED',
  'ACTIVE', 'COMPLETED', 'REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED',
  'PAYOUT_SENT', 'PAYOUT_CONFIRMED', 'ON_HOLD', 'MANUAL_REVIEW', 'REJECTED', 'CANCELLED',
];

export default function AdminDepositDetailPage() {
  const params = useParams();
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (params.id) {
      getAdminDeposit(params.id as string)
        .then(setDeposit)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const handleTransition = async (status: string) => {
    try {
      const updated = await transitionDeposit(deposit.deposit_id, status, reason);
      setDeposit(updated);
      setReason('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Transition failed');
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!deposit) return <div className="text-danger">Deposit not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deposit {deposit.deposit_id.slice(0, 8)}...</h1>
        <StatusBadge status={deposit.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Details</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Network:</span> {deposit.network}</div>
            <div><span className="text-text-secondary">Asset:</span> {deposit.asset_symbol}</div>
            <div><span className="text-text-secondary">Amount:</span> {deposit.confirmed_amount || '—'}</div>
            <div><span className="text-text-secondary">TX Hash:</span> {deposit.tx_hash || '—'}</div>
            <div><span className="text-text-secondary">Route:</span> <span className="font-mono text-xs">{deposit.deposit_route}</span></div>
            <div><span className="text-text-secondary">Source:</span> {deposit.source_address || '—'}</div>
            <div><span className="text-text-secondary">Confirmations:</span> {deposit.confirmation_count}/{deposit.min_required_confirmations}</div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Dates</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Created:</span> {deposit.created_at ? new Date(deposit.created_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Detected:</span> {deposit.detected_at ? new Date(deposit.detected_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Confirmed:</span> {deposit.confirmed_at ? new Date(deposit.confirmed_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Activated:</span> {deposit.activated_at ? new Date(deposit.activated_at).toLocaleString() : '—'}</div>
            <div><span className="text-text-secondary">Completed:</span> {deposit.completed_at ? new Date(deposit.completed_at).toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-4 mb-6">
        <h2 className="font-medium mb-3">Transition Status</h2>
        <div className="flex gap-2 mb-3">
          <select
            className="flex-1 px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
            id="status-select"
          >
            <option value="">Select target status...</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById('status-select') as HTMLSelectElement;
              if (select.value) handleTransition(select.value);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            Transition
          </button>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
        />
      </div>

      <Link href="/deposits" className="text-primary text-sm hover:underline">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
