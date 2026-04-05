'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminDashboardStats } from '../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeDeposits: 0,
    pendingReview: 0,
    pendingPayouts: 0,
    pendingReports: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboardStats()
      .then((data) => {
        setStats({
          activeDeposits: data.activeDeposits || 0,
          pendingReview: data.pendingReview || 0,
          pendingPayouts: data.pendingPayouts || 0,
          pendingReports: data.pendingReports || 0,
          totalUsers: data.totalUsers || 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  const statCards = [
    { label: 'Active Deposits', value: stats.activeDeposits, href: '/deposits?status=ACTIVE', color: 'text-success' },
    { label: 'Pending Review', value: stats.pendingReview, href: '/deposits?status=MANUAL_REVIEW', color: 'text-warning' },
    { label: 'Pending Payouts', value: stats.pendingPayouts, href: '/payouts?status=PENDING_APPROVAL', color: 'text-link' },
    { label: 'Pending Reports', value: stats.pendingReports, href: '/reports?status=PENDING_APPROVAL', color: 'text-primary' },
    { label: 'Total Users', value: stats.totalUsers, href: '/users', color: 'text-text' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <div className="bg-bg-secondary rounded-lg p-6 hover:bg-bg-tertiary transition-colors">
              <div className="text-text-secondary text-sm">{stat.label}</div>
              <div className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-bg-secondary rounded-lg p-6">
        <h2 className="font-medium mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/deposits" className="text-primary text-sm hover:underline">View All Deposits</Link>
          <Link href="/payouts" className="text-primary text-sm hover:underline">View Payouts</Link>
          <Link href="/reports" className="text-primary text-sm hover:underline">View Reports</Link>
          <Link href="/periods" className="text-primary text-sm hover:underline">Manage Periods</Link>
          <Link href="/users" className="text-primary text-sm hover:underline">View Users</Link>
          <Link href="/audit" className="text-primary text-sm hover:underline">Audit Log</Link>
        </div>
      </div>
    </div>
  );
}
