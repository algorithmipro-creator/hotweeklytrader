import { createElement } from 'react';
import Link from 'next/link';
import { StatusBadge } from '../../../components/status-badge';

export type UserCycle = {
  deposit_id: string;
  status: string;
  network: string;
  asset_symbol: string;
  confirmed_amount: number | null;
  created_at: string;
};

export function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

export function formatConfirmedAmount(amount: number | null, assetSymbol: string) {
  return amount != null ? `${amount} ${assetSymbol}` : '-';
}

export function classifyUserDetailError(error: any) {
  return error?.response?.status === 404 ? 'not_found' : 'load_error';
}

export function UserCyclesTable({ cycles }: { cycles: UserCycle[] }) {
  if (!cycles.length) {
    return createElement('div', { className: 'text-text-secondary' }, 'No cycles yet');
  }

  return createElement(
    'table',
    { className: 'w-full text-sm' },
    createElement(
      'thead',
      { className: 'bg-bg-tertiary text-text-secondary' },
      createElement(
        'tr',
        null,
        createElement('th', { className: 'text-left p-3' }, 'Cycle ID'),
        createElement('th', { className: 'text-left p-3' }, 'Status'),
        createElement('th', { className: 'text-left p-3' }, 'Network'),
        createElement('th', { className: 'text-left p-3' }, 'Asset'),
        createElement('th', { className: 'text-left p-3' }, 'Confirmed'),
        createElement('th', { className: 'text-left p-3' }, 'Created'),
        createElement('th', { className: 'text-left p-3' }, ''),
      ),
    ),
    createElement(
      'tbody',
      null,
      ...cycles.map((cycle) =>
        createElement(
          'tr',
          { key: cycle.deposit_id, className: 'border-t border-gray-700' },
          createElement('td', { className: 'p-3 font-mono text-xs' }, shortId(cycle.deposit_id)),
          createElement('td', { className: 'p-3' }, createElement(StatusBadge, { status: cycle.status })),
          createElement('td', { className: 'p-3' }, cycle.network),
          createElement('td', { className: 'p-3' }, cycle.asset_symbol),
          createElement('td', { className: 'p-3' }, formatConfirmedAmount(cycle.confirmed_amount, cycle.asset_symbol)),
          createElement(
            'td',
            { className: 'p-3 text-text-secondary' },
            cycle.created_at ? new Date(cycle.created_at).toLocaleDateString() : '-',
          ),
          createElement(
            'td',
            { className: 'p-3' },
            createElement(
              Link,
              { href: `/deposits/${cycle.deposit_id}`, className: 'text-primary text-xs hover:underline' },
              'View',
            ),
          ),
        ),
      ),
    ),
  );
}
