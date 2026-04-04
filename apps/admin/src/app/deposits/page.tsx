'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminDeposits } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  useEffect(() => {
    getAdminDeposits({
      status: statusFilter || undefined,
      investment_period_id: periodFilter || undefined,
      limit: 100,
    })
      .then(setDeposits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, periodFilter]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <div className="flex gap-3">
          <input
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            placeholder="Filter by period ID"
            className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="AWAITING_TRANSFER">Awaiting Transfer</option>
            <option value="DETECTED">Detected</option>
            <option value="CONFIRMING">Confirming</option>
            <option value="MANUAL_REVIEW">Manual Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REPORT_READY">Report Ready</option>
            <option value="PAYOUT_PENDING">Payout Pending</option>
          </select>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Period</th>
              <th className="text-left p-3">Network</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.deposit_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{d.deposit_id.slice(0, 8)}...</td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="text-text">{d.investment_period_title || d.investment_period_id}</span>
                    <span className="text-text-secondary text-xs">{d.investment_period_status || 'Unknown period'}</span>
                  </div>
                </td>
                <td className="p-3">{d.network} / {d.asset_symbol}</td>
                <td className="p-3">{d.confirmed_amount ? `${d.confirmed_amount} ${d.asset_symbol}` : '—'}</td>
                <td className="p-3"><StatusBadge status={d.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(d.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Link href={`/deposits/${d.deposit_id}`} className="text-primary text-xs hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {deposits.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No deposits found</div>
        )}
      </div>
    </div>
  );
}
