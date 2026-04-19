import Link from 'next/link';
import { StatusBadge } from './status-badge';
import { useLanguage } from '../providers/language-provider';

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
  const { t } = useLanguage();

  return (
    <Link href={`/deposits/${deposit.deposit_id}`} className="block">
      <div className="mb-3 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(11,28,36,0.98),rgba(8,17,23,0.96))] p-4 shadow-[0_16px_34px_rgba(0,0,0,0.24)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-100">{deposit.network} / {deposit.asset_symbol}</span>
          <StatusBadge status={deposit.status} />
        </div>

        {deposit.confirmed_amount && (
          <div className="mb-1 text-2xl font-bold text-slate-50">
            {deposit.confirmed_amount} {deposit.asset_symbol}
          </div>
        )}

        <div className="text-xs text-slate-400">
          {t('depositCard.created')}: {new Date(deposit.created_at).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
