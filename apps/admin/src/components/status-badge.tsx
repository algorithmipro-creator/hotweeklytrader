const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/20 text-success',
  SUSPENDED: 'bg-danger/20 text-danger',
  BANNED: 'bg-danger/20 text-danger',
  CREATED: 'bg-gray-500/20 text-gray-400',
  AWAITING_TRANSFER: 'bg-warning/20 text-warning',
  DETECTED: 'bg-link/20 text-link',
  CONFIRMING: 'bg-link/20 text-link',
  CONFIRMED: 'bg-success/20 text-success',
  COMPLETED: 'bg-link/20 text-link',
  REPORT_READY: 'bg-primary/20 text-primary',
  PAYOUT_PENDING: 'bg-warning/20 text-warning',
  PAYOUT_APPROVED: 'bg-success/20 text-success',
  PAYOUT_SENT: 'bg-success/20 text-success',
  PAYOUT_CONFIRMED: 'bg-success/20 text-success',
  ON_HOLD: 'bg-warning/20 text-warning',
  MANUAL_REVIEW: 'bg-warning/20 text-warning',
  REJECTED: 'bg-danger/20 text-danger',
  CANCELLED: 'bg-danger/20 text-danger',
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PENDING_APPROVAL: 'bg-warning/20 text-warning',
  APPROVED: 'bg-success/20 text-success',
  PUBLISHED: 'bg-success/20 text-success',
  LOCKED: 'bg-warning/20 text-warning',
  ARCHIVED: 'bg-gray-500/20 text-gray-400',
  PREPARED: 'bg-gray-500/20 text-gray-400',
  SENT: 'bg-success/20 text-success',
  FAILED: 'bg-danger/20 text-danger',
  PENDING: 'bg-warning/20 text-warning',
  PAID_MANUAL: 'bg-success/20 text-success',
  PAID_BATCH: 'bg-success/20 text-success',
  SKIPPED: 'bg-gray-500/20 text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Algorithm works',
};

export function getStatusLabel(status: string) {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {getStatusLabel(status)}
    </span>
  );
}
