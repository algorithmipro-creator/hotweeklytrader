'use client';

import { useState, useEffect } from 'react';
import { getAdminPeriods, createPeriod, updatePeriodStatus } from '../../lib/api';

const NEXT_STATUS_BY_CURRENT: Record<string, string | null> = {
  FUNDING: 'TRADING_ACTIVE',
  TRADING_ACTIVE: 'REPORTING',
  REPORTING: 'PAYOUT_IN_PROGRESS',
  PAYOUT_IN_PROGRESS: 'CLOSED',
  CLOSED: null,
};

const STATUS_LABELS: Record<string, string> = {
  FUNDING: 'Funding',
  TRADING_ACTIVE: 'Trading active',
  REPORTING: 'Reporting',
  PAYOUT_IN_PROGRESS: 'Payout in progress',
  CLOSED: 'Closed',
};

const STATUS_BADGES: Record<string, string> = {
  FUNDING: 'bg-success/20 text-success',
  TRADING_ACTIVE: 'bg-primary/20 text-primary',
  REPORTING: 'bg-warning/20 text-warning',
  PAYOUT_IN_PROGRESS: 'bg-link/20 text-link',
  CLOSED: 'bg-gray-500/20 text-gray-400',
};

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    period_type: 'fixed',
    start_date: '',
    end_date: '',
    accepted_networks: 'BSC,TRON,TON',
    accepted_assets: 'USDT,USDC',
  });

  useEffect(() => {
    getAdminPeriods()
      .then(setPeriods)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPeriod = await createPeriod({
        ...formData,
        accepted_networks: formData.accepted_networks.split(',').map((s) => s.trim()),
        accepted_assets: formData.accepted_assets.split(',').map((s) => s.trim()),
      });
      setPeriods((prev) => [newPeriod, ...prev]);
      setShowForm(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create period');
    }
  };

  const handleAdvance = async (id: string, nextStatus: string) => {
    try {
      await updatePeriodStatus(id, nextStatus);
      setPeriods((prev) => prev.map((p) => (p.investment_period_id === id ? { ...p, status: nextStatus } : p)));
    } catch (err) {
      console.error('Failed to update period status:', err);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Investment Periods</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          {showForm ? 'Cancel' : '+ New Period'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-secondary rounded-lg p-4 mb-6 space-y-3">
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Period title"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
              required
            />
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
              required
            />
          </div>
          <input
            type="text"
            value={formData.accepted_networks}
            onChange={(e) => setFormData({ ...formData, accepted_networks: e.target.value })}
            placeholder="Networks (comma-separated)"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
          />
          <input
            type="text"
            value={formData.accepted_assets}
            onChange={(e) => setFormData({ ...formData, accepted_assets: e.target.value })}
            placeholder="Assets (comma-separated)"
            className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
          />
          <button type="submit" className="w-full px-4 py-2 bg-success text-white rounded-lg text-sm">
            Create Period
          </button>
        </form>
      )}

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Period</th>
              <th className="text-left p-3">Networks</th>
              <th className="text-left p-3">Assets</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const nextStatus = NEXT_STATUS_BY_CURRENT[p.status] || null;
              const currentLabel = STATUS_LABELS[p.status] || p.status;

              return (
                <tr key={p.investment_period_id} className="border-t border-gray-700">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3 text-text-secondary">
                    {new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-text-secondary">{p.accepted_networks.join(', ')}</td>
                  <td className="p-3 text-text-secondary">{p.accepted_assets.join(', ')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGES[p.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {currentLabel}
                    </span>
                  </td>
                  <td className="p-3">
                    {nextStatus ? (
                      <button
                        onClick={() => handleAdvance(p.investment_period_id, nextStatus)}
                        className="px-3 py-1 rounded bg-bg-tertiary text-text text-xs border border-gray-600 hover:border-primary"
                      >
                        Advance to {STATUS_LABELS[nextStatus]}
                      </button>
                    ) : (
                      <span className="text-xs text-text-secondary">No action</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {periods.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No periods found</div>
        )}
      </div>
    </div>
  );
}
