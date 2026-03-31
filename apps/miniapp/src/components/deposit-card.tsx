import Link from 'next/link';
import { StatusBadge } from './status-badge';

interface DepositCardProps {
  deposit: {
    deposit_id: string;
    network: string;
    asset_symbol: string;
    confirmed_amount: number | null;
    status: string;
    created_at: string;
    deposit_route: string;
  };
}

export function DepositCard({ deposit }: DepositCardProps) {
  return (
    <Link href={`/deposits/${deposit.deposit_id}`} className="block">
      <div className="p-4 bg-bg-secondary rounded-lg mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{deposit.network} / {deposit.asset_symbol}</span>
          <StatusBadge status={deposit.status} />
        </div>

        {deposit.confirmed_amount && (
          <div className="text-lg font-bold mb-1">
            {deposit.confirmed_amount} {deposit.asset_symbol}
          </div>
        )}

        <div className="text-text-secondary text-xs">
          Created: {new Date(deposit.created_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
