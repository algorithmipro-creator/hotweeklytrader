'use client';

import { useState, useEffect } from 'react';
import { getAuditLog } from '../../lib/api';

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: '', action: '' });

  useEffect(() => {
    getAuditLog({
      entityType: filter.entityType || undefined,
      action: filter.action || undefined,
      limit: 100,
    })
      .then((data) => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      <div className="flex gap-3 mb-4">
        <select
          value={filter.entityType}
          onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Entity Types</option>
          <option value="User">User</option>
          <option value="Deposit">Deposit</option>
          <option value="InvestmentPeriod">Period</option>
          <option value="ProfitLossReport">Report</option>
          <option value="Payout">Payout</option>
        </select>
        <input
          type="text"
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          placeholder="Filter by action..."
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Entity</th>
              <th className="text-left p-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.audit_event_id} className="border-t border-gray-700">
                <td className="p-3 text-text-secondary whitespace-nowrap">
                  {new Date(e.event_time).toLocaleString()}
                </td>
                <td className="p-3">{e.actor_type}:{e.actor_id?.slice(0, 8) || '—'}</td>
                <td className="p-3 font-medium">{e.action}</td>
                <td className="p-3 text-text-secondary">
                  {e.entity_type}:{e.entity_id?.slice(0, 8) || '—'}
                </td>
                <td className="p-3 text-text-secondary">{e.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No audit events found</div>
        )}
      </div>
    </div>
  );
}
