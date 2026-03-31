'use client';

import { useState, useEffect } from 'react';
import { getAdminReports, submitReport, approveReport, publishReport } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    getAdminReports({ status: statusFilter || undefined, limit: 100 })
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleAction = async (reportId: string, action: 'submit' | 'approve' | 'publish') => {
    try {
      if (action === 'submit') await submitReport(reportId);
      else if (action === 'approve') await approveReport(reportId);
      else if (action === 'publish') await publishReport(reportId);

      const updated = await getAdminReports({ status: statusFilter || undefined, limit: 100 });
      setReports(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Deposit</th>
              <th className="text-left p-3">Gross</th>
              <th className="text-left p-3">Net</th>
              <th className="text-left p-3">Payout</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Generated</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.report_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{r.deposit_id.slice(0, 8)}...</td>
                <td className={`p-3 ${r.gross_result >= 0 ? 'text-success' : 'text-danger'}`}>
                  {r.gross_result >= 0 ? '+' : ''}{r.gross_result}
                </td>
                <td className={`p-3 ${r.net_result >= 0 ? 'text-success' : 'text-danger'}`}>
                  {r.net_result >= 0 ? '+' : ''}{r.net_result}
                </td>
                <td className="p-3 font-medium">{r.payout_amount}</td>
                <td className="p-3"><StatusBadge status={r.status} /></td>
                <td className="p-3 text-text-secondary">{new Date(r.generated_at).toLocaleDateString()}</td>
                <td className="p-3 space-x-2">
                  {(r.status === 'DRAFT' || r.status === 'REVISED') && (
                    <button onClick={() => handleAction(r.report_id, 'submit')} className="text-warning text-xs hover:underline">
                      Submit
                    </button>
                  )}
                  {r.status === 'PENDING_APPROVAL' && (
                    <button onClick={() => handleAction(r.report_id, 'approve')} className="text-success text-xs hover:underline">
                      Approve
                    </button>
                  )}
                  {r.status === 'APPROVED' && (
                    <button onClick={() => handleAction(r.report_id, 'publish')} className="text-primary text-xs hover:underline">
                      Publish
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reports.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No reports found</div>
        )}
      </div>
    </div>
  );
}
