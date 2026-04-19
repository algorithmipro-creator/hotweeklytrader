'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '\uD83D\uDCCA' },
  { href: '/users', label: 'Users', icon: '\uD83D\uDC65' },
  { href: '/deposits', label: 'Cycles', icon: '\uD83D\uDCB0' },
  { href: '/traders', label: 'Traders', icon: '\uD83E\uDDD1' },
  { href: '/periods', label: 'Periods', icon: '\uD83D\uDCC5' },
  { href: '/trader-reporting', label: 'Trader Reporting', icon: '\uD83D\uDCC8' },
  { href: '/reports', label: 'Reports', icon: '\uD83D\uDCCB' },
  { href: '/referral-rewards', label: 'Referral Rewards', icon: '\uD83C\uDFAF' },
  { href: '/payouts', label: 'Payouts', icon: '\uD83D\uDCB8' },
  { href: '/support', label: 'Support', icon: '\uD83C\uDD98' },
  { href: '/audit', label: 'Audit Log', icon: '\uD83D\uDD0D' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-bg-secondary min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">Admin Panel</h1>
        {user && (
          <p className="text-text-secondary text-sm mt-1">
            {user.display_name || user.username}
          </p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text hover:bg-bg-tertiary rounded-lg"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
