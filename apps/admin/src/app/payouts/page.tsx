'use client';

import { useState, useEffect } from 'react';
import { getAdminPayouts, approvePayout, recordPayoutSent, recordPayoutConfirmed, recordPayoutFailed } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminPayouts({ status: statusFilter || undefined, limit: 100 })
      .then(setPayouts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAction = async (payoutId: string, action: string, txHash?: string) => {
    try {
      if (action === 'approve') await approvePayout(payoutId);
      else if (action === 'sent') {
        const hash = txHash || prompt('Enter TX hash:');
        if (!hash) return;
        await recordPayoutSent(payoutId, hash);
      }
      else if (action === 'confirmed') await recordPayoutConfirmed(payoutId);
      else if (action === 'failed') {
        const reason = prompt('Failure reason:') || 'Unknown';
        await recordPayoutFailed(payoutId, reason);
      }

      const updated = await getAdminPayouts({ status: statusFilter || undefined, limit: 100 });
      setPayouts(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payouts</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Deposit</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Network</th>
              <th className="text-left p-3">To</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.payout_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{p.deposit_id.slice(0, 8)}...</td>
                <td className="p-3 font-medium">{p.amount} {p.asset_symbol}</td>
                <td className="p-3">{p.network}</td>
                <td className="p-3 font-mono text-xs">{p.destination_address.slice(0, 10)}...{p.destination_address.slice(-8)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="p-3 space-x-2">
                  {p.status === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleAction(p.payout_id, 'approve')} className="text-success text-xs hover:underline">
                      Approve
                    </button>
                  )}
                  {p.status === 'APPROVED' && (
                    <button onClick={() => handleAction(p.payout_id, 'sent')} className="text-link text-xs hover:underline">
                      Mark Sent
                    </button>
                  )}
                  {p.status === 'SENT' && (
                    <button onClick={() => handleAction(p.payout_id, 'confirmed')} className="text-success text-xs hover:underline">
                      Confirm
                    </button>
                  )}
                  {(p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED') && (
                    <button onClick={() => handleAction(p.payout_id, 'failed')} className="text-danger text-xs hover:underline">
                      Fail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payouts.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No payouts found</div>
        )}
      </div>
    </div>
  );
}
