'use client';

import { useLanguage } from '../providers/language-provider';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CREATED: { label: 'status.CREATED', className: 'border-slate-400/20 bg-slate-500/10 text-slate-300' },
  AWAITING_TRANSFER: { label: 'status.AWAITING_TRANSFER', className: 'border-amber-300/20 bg-amber-400/10 text-amber-200' },
  DETECTED: { label: 'status.DETECTED', className: 'border-sky-300/20 bg-sky-400/10 text-sky-200' },
  CONFIRMING: { label: 'status.CONFIRMING', className: 'border-sky-300/20 bg-sky-400/10 text-sky-200' },
  CONFIRMED: { label: 'status.CONFIRMED', className: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' },
  ACTIVE: { label: 'status.ACTIVE', className: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200' },
  COMPLETED: { label: 'status.COMPLETED', className: 'border-[#34b5dc]/20 bg-[#34b5dc]/12 text-[#d8edf3]' },
  REPORT_READY: { label: 'status.REPORT_READY', className: 'border-violet-300/20 bg-violet-400/10 text-violet-200' },
  PAYOUT_PENDING: { label: 'status.PAYOUT_PENDING', className: 'border-amber-300/20 bg-amber-400/10 text-amber-200' },
  PAYOUT_APPROVED: { label: 'status.PAYOUT_APPROVED', className: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' },
  PAYOUT_SENT: { label: 'status.PAYOUT_SENT', className: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200' },
  PAYOUT_CONFIRMED: { label: 'status.PAYOUT_CONFIRMED', className: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' },
  ON_HOLD: { label: 'status.ON_HOLD', className: 'border-orange-300/20 bg-orange-400/10 text-orange-200' },
  MANUAL_REVIEW: { label: 'status.MANUAL_REVIEW', className: 'border-orange-300/20 bg-orange-400/10 text-orange-200' },
  REJECTED: { label: 'status.REJECTED', className: 'border-rose-300/20 bg-rose-400/10 text-rose-200' },
  CANCELLED: { label: 'status.CANCELLED', className: 'border-rose-300/20 bg-rose-400/10 text-rose-200' },
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const config = STATUS_MAP[status] || { label: status, className: 'border-slate-400/20 bg-slate-500/10 text-slate-300' };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${config.className}`}>
      {STATUS_MAP[status] ? t(config.label) : config.label}
    </span>
  );
}
