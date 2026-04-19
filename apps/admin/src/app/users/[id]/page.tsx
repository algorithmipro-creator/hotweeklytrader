'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminUser } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';
import { classifyUserDetailError, UserCyclesTable } from './helpers';

type AdminUserDetail = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  status: string;
  telegram_id: string;
  language: string;
  created_at: string;
  last_login_at: string | null;
  legal_ack_version: string | null;
  risk_ack_version: string | null;
  cycles: any[];
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    setLoading(true);
    setUser(null);
    setLoadError(null);
    setNotFound(false);

    getAdminUser(params.id as string)
      .then(setUser)
      .catch((error) => {
        if (classifyUserDetailError(error) === 'not_found') {
          setNotFound(true);
          return;
        }

        console.error('Failed to load user detail:', error);
        setLoadError('Failed to load user');
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (loadError) {
    return <div className="text-danger">{loadError}</div>;
  }

  if (notFound || !user) return <div className="text-danger">User not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{user.display_name || user.username || 'User'}</h1>
          <div className="mt-2 text-sm text-text-secondary font-mono">{user.user_id}</div>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Profile</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Telegram ID:</span> {user.telegram_id}</div>
            <div><span className="text-text-secondary">Username:</span> {user.username || '-'}</div>
            <div><span className="text-text-secondary">Display name:</span> {user.display_name || '-'}</div>
            <div><span className="text-text-secondary">Language:</span> {user.language}</div>
            <div><span className="text-text-secondary">Created:</span> {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</div>
            <div><span className="text-text-secondary">Last login:</span> {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}</div>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg p-4">
          <h2 className="font-medium mb-3">Acknowledgements</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-text-secondary">Legal:</span> {user.legal_ack_version || '-'}</div>
            <div><span className="text-text-secondary">Risk:</span> {user.risk_ack_version || '-'}</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Cycles</h2>
          <span className="text-xs text-text-secondary">{user.cycles?.length || 0} total</span>
        </div>

        <UserCyclesTable cycles={user.cycles || []} />
      </div>

      <div className="mt-6">
        <Link href="/users" className="text-primary text-sm hover:underline">
          &larr; Back to Users
        </Link>
      </div>
    </div>
  );
}
