const REPORTING_PERIOD_STATUSES = new Set(['ACTIVE', 'LOCKED', 'COMPLETED', 'ARCHIVED']);

export function filterPeriodsForTraderReporting(periods) {
  return (periods || []).filter((period) => REPORTING_PERIOD_STATUSES.has(period.status));
}

export function buildTraderReportStatusSummary(reports) {
  return (reports || []).reduce((summary, report) => {
    const status = report.report_status || report.status || 'MISSING';
    summary.total += 1;

    if (status === 'MISSING') summary.missing += 1;
    if (status === 'DRAFT' || status === 'REVISED') summary.draft += 1;
    if (status === 'PENDING_APPROVAL') summary.pendingApproval += 1;
    if (status === 'APPROVED') summary.approved += 1;
    if (status === 'PUBLISHED') summary.published += 1;

    return summary;
  }, {
    total: 0,
    missing: 0,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    published: 0,
  });
}
