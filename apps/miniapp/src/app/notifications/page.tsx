'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getNotifications, markNotificationRead } from '../../lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, delivery_status: 'READ' } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              className={`p-4 rounded-lg ${
                n.delivery_status === 'READ' ? 'bg-bg-secondary' : 'bg-bg-tertiary'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{n.title}</span>
                {n.delivery_status !== 'READ' && (
                  <button
                    onClick={() => handleRead(n.notification_id)}
                    className="text-xs text-primary"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <p className="text-text-secondary text-sm">{n.body}</p>
              <div className="text-text-secondary text-xs mt-1">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        &larr; Back to Home
      </Link>
    </div>
  );
}
