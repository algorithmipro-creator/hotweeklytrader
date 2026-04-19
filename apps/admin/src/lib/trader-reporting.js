export const DEFAULT_TRADER_REPORT_FORM = {
  ending_balance_usdt: '0',
  trader_fee_percent: '40',
  tron_fee: '0',
  ton_fee: '0',
  bsc_fee: '0',
};

function toFormNumber(value, fallback = '0') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }

  return String(value);
}

export function buildTraderReportForm(report) {
  if (!report) {
    return { ...DEFAULT_TRADER_REPORT_FORM };
  }

  const networkFees = report.network_fees_json || {};

  return {
    ending_balance_usdt: toFormNumber(report.ending_balance_usdt),
    trader_fee_percent: toFormNumber(report.trader_fee_percent, '40'),
    tron_fee: toFormNumber(networkFees.TRON),
    ton_fee: toFormNumber(networkFees.TON),
    bsc_fee: toFormNumber(networkFees.BSC),
  };
}

export function getTraderReportActionAvailability(report, registry) {
  const status = report?.status || 'MISSING';
  const hasReport = Boolean(report?.trader_report_id);
  const hasRegistry = Boolean(registry?.payout_registry_id);
  const canSave = !hasReport || status !== 'PUBLISHED';

  return {
    canPreview: true,
    canSave,
    canSubmit: hasReport && (status === 'DRAFT' || status === 'REVISED'),
    canApprove: hasReport && status === 'PENDING_APPROVAL',
    canPublish: hasReport && status === 'APPROVED',
    canExportCsv: hasReport,
    canGenerateRegistry: hasReport && (status === 'APPROVED' || status === 'PUBLISHED') && !hasRegistry,
    canMarkRemainingPaid: hasRegistry,
  };
}
