'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers, updateUserStatus } from '../../lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAdminUsers({ search: search || undefined, limit: 100 })
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await updateUserStatus(userId, status);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, status } : u)));
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="px-3 py-2 bg-bg-secondary rounded-lg text-sm text-text"
        />
      </div>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Telegram ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-t border-gray-700">
                <td className="p-3">{user.display_name || user.username || '—'}</td>
                <td className="p-3 text-text-secondary">{user.telegram_id}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-3 text-text-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.user_id, e.target.value)}
                    className="bg-bg-tertiary text-text text-xs px-2 py-1 rounded"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No users found</div>
        )}
      </div>
    </div>
  );
}
