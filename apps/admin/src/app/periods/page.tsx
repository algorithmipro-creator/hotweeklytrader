'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminPeriods, createPeriod, updatePeriodStatus } from '../../lib/api';

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    period_type: 'fixed',
    status: 'ACTIVE',
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

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updatePeriodStatus(id, status);
      setPeriods((prev) => prev.map((p) => (p.investment_period_id === id ? { ...p, status } : p)));
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
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
            </select>
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
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.investment_period_id} className="border-t border-gray-700">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-text-secondary">
                  {new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}
                </td>
                <td className="p-3 text-text-secondary">{p.accepted_networks.join(', ')}</td>
                <td className="p-3 text-text-secondary">{p.accepted_assets.join(', ')}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    p.status === 'ACTIVE' ? 'bg-success/20 text-success' :
                    p.status === 'DRAFT' ? 'bg-gray-500/20 text-gray-400' :
                    p.status === 'COMPLETED' ? 'bg-link/20 text-link' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.investment_period_id, e.target.value)}
                      className="bg-bg-tertiary text-text text-xs px-2 py-1 rounded"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="LOCKED">Locked</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                    <Link
                      href={`/trader-reporting?periodId=${p.investment_period_id}`}
                      className="text-primary text-xs hover:underline"
                    >
                      Reporting
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {periods.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No periods found</div>
        )}
      </div>
    </div>
  );
}
