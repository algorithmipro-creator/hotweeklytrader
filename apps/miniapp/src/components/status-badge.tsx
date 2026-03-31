const STATUS_MAP: Record<string, { label: string; className: string }> = {
  CREATED: { label: 'Created', className: 'bg-gray-500/20 text-gray-400' },
  AWAITING_TRANSFER: { label: 'Awaiting Transfer', className: 'bg-yellow-500/20 text-yellow-400' },
  DETECTED: { label: 'Detected', className: 'bg-blue-500/20 text-blue-400' },
  CONFIRMING: { label: 'Confirming', className: 'bg-blue-500/20 text-blue-400' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-green-500/20 text-green-400' },
  ACTIVE: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-500/20 text-blue-400' },
  REPORT_READY: { label: 'Report Ready', className: 'bg-purple-500/20 text-purple-400' },
  PAYOUT_PENDING: { label: 'Payout Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  PAYOUT_APPROVED: { label: 'Payout Approved', className: 'bg-green-500/20 text-green-400' },
  PAYOUT_SENT: { label: 'Payout Sent', className: 'bg-green-500/20 text-green-400' },
  PAYOUT_CONFIRMED: { label: 'Payout Confirmed', className: 'bg-green-500/20 text-green-400' },
  ON_HOLD: { label: 'On Hold', className: 'bg-orange-500/20 text-orange-400' },
  MANUAL_REVIEW: { label: 'Manual Review', className: 'bg-orange-500/20 text-orange-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500/20 text-red-400' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, className: 'bg-gray-500/20 text-gray-400' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
