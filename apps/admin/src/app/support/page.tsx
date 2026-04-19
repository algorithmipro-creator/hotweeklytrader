'use client';

import { useEffect, useState } from 'react';
import { getAdminSupportCases, updateAdminSupportCase } from '../../lib/api';

export default function SupportPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadCases = async (status?: string) => {
    const response = await getAdminSupportCases({
      status: status || undefined,
      limit: 100,
    });
    setCases(response.cases || []);
  };

  useEffect(() => {
    loadCases(statusFilter)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const handleStatusChange = async (caseId: string, status: string) => {
    try {
      await updateAdminSupportCase(caseId, {
        status,
        resolution_summary: replyDrafts[caseId] ?? undefined,
      });
      await loadCases(statusFilter);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update support case');
    }
  };

  const handleReplySave = async (caseId: string) => {
    try {
      await updateAdminSupportCase(caseId, {
        status: 'IN_PROGRESS',
        resolution_summary: replyDrafts[caseId] ?? '',
      });
      await loadCases(statusFilter);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save reply');
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Case</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Reason</th>
              <th className="text-left p-3">Reply</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((supportCase) => (
              <tr key={supportCase.case_id} className="border-t border-gray-700">
                <td className="p-3 font-mono text-xs">{supportCase.case_id.slice(0, 8)}...</td>
                <td className="p-3">
                  <div>{supportCase.user_display_name || supportCase.user_username || 'Unknown user'}</div>
                  <div className="text-xs text-text-secondary">
                    {supportCase.user_username ? `@${supportCase.user_username}` : supportCase.user_telegram_id || supportCase.user_id}
                  </div>
                </td>
                <td className="p-3">{supportCase.category}</td>
                <td className="p-3">{supportCase.priority}</td>
                <td className="p-3">{supportCase.status}</td>
                <td className="p-3 max-w-md truncate" title={supportCase.opened_reason}>
                  {supportCase.opened_reason}
                </td>
                <td className="p-3 min-w-[260px]">
                  <textarea
                    value={replyDrafts[supportCase.case_id] ?? supportCase.resolution_summary ?? ''}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [supportCase.case_id]: e.target.value }))}
                    className="w-full p-2 bg-bg-tertiary rounded text-xs text-text min-h-[88px]"
                    placeholder="Write a reply for the user..."
                  />
                  <button
                    onClick={() => handleReplySave(supportCase.case_id)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Reply
                  </button>
                </td>
                <td className="p-3 text-text-secondary">{new Date(supportCase.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <select
                    value={supportCase.status}
                    onChange={(e) => handleStatusChange(supportCase.case_id, e.target.value)}
                    className="bg-bg-tertiary text-text text-xs px-2 py-1 rounded"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {cases.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No support cases found</div>
        )}
      </div>
    </div>
  );
}
