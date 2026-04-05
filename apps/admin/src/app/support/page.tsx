'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminSupportCases, updateAdminSupportCase } from '../../lib/api';
import { StatusBadge } from '../../components/status-badge';

type SupportCase = {
  case_id: string;
  user_id: string;
  user_display_name?: string | null;
  user_username?: string | null;
  user_telegram_id?: string | null;
  related_deposit_id: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  opened_reason: string;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

function formatUserLabel(item: SupportCase) {
  if (item.user_display_name) return item.user_display_name;
  if (item.user_username) return `@${item.user_username}`;
  if (item.user_telegram_id) return `TG ${item.user_telegram_id}`;
  return item.user_id;
}

export default function SupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const loadCases = async () => {
    const data = await getAdminSupportCases({
      status: statusFilter || undefined,
      limit: 100,
    });
    setCases(data.cases || []);
  };

  useEffect(() => {
    setLoading(true);
    loadCases()
      .catch((err) => setError(err.response?.data?.message || 'Failed to load support cases'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const sortedCases = useMemo(
    () => [...cases].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    [cases],
  );

  const handleReply = async (item: SupportCase) => {
    setSavingId(item.case_id);
    try {
      await updateAdminSupportCase(item.case_id, {
        resolution_summary: draftReplies[item.case_id] ?? item.resolution_summary ?? '',
        status: item.status === 'OPEN' ? 'IN_PROGRESS' : item.status,
      });
      await loadCases();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update support case');
    } finally {
      setSavingId(null);
    }
  };

  const handleStatusChange = async (item: SupportCase, status: string) => {
    setSavingId(item.case_id);
    try {
      await updateAdminSupportCase(item.case_id, {
        status,
        resolution_summary: draftReplies[item.case_id] ?? item.resolution_summary ?? undefined,
      });
      await loadCases();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update support case');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-sm text-text-secondary mt-1">
            Review support cases, see who created them, and save an operator reply.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="space-y-4">
        {sortedCases.map((item) => (
          <div key={item.case_id} className="bg-bg-secondary rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium">{formatUserLabel(item)}</div>
                <div className="text-xs text-text-secondary">
                  {item.user_username ? `@${item.user_username}` : 'No username'}{item.user_telegram_id ? ` • ${item.user_telegram_id}` : ''}
                </div>
                <div className="text-xs text-text-secondary">
                  Case {item.case_id} • {new Date(item.created_at).toLocaleString()}
                </div>
                {item.related_deposit_id && (
                  <div className="text-xs text-text-secondary">
                    Deposit: {item.related_deposit_id}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item, e.target.value)}
                  disabled={savingId === item.case_id}
                  className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-text-secondary text-xs uppercase mb-1">Category</div>
                <div>{item.category}</div>
              </div>
              <div>
                <div className="text-text-secondary text-xs uppercase mb-1">Priority</div>
                <div>{item.priority}</div>
              </div>
            </div>

            <div>
              <div className="text-text-secondary text-xs uppercase mb-1">User Message</div>
              <div className="text-sm whitespace-pre-wrap">{item.opened_reason}</div>
            </div>

            <div className="space-y-2">
              <div className="text-text-secondary text-xs uppercase">Admin Reply</div>
              <textarea
                value={draftReplies[item.case_id] ?? item.resolution_summary ?? ''}
                onChange={(e) => setDraftReplies((prev) => ({ ...prev, [item.case_id]: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text"
                placeholder="Write a reply for the user..."
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleReply(item)}
                  disabled={savingId === item.case_id}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {savingId === item.case_id ? 'Saving...' : 'Reply'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {sortedCases.length === 0 && (
          <div className="bg-bg-secondary rounded-lg p-8 text-center text-text-secondary">
            No support cases found.
          </div>
        )}
      </div>
    </div>
  );
}
