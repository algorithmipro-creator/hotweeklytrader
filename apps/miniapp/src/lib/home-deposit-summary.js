function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByCreatedAtDesc(left, right) {
  return toTimestamp(right?.created_at) - toTimestamp(left?.created_at);
}

function pickLatestDeposit(deposits) {
  if (!Array.isArray(deposits) || deposits.length === 0) {
    return null;
  }

  const orderedDeposits = [...deposits].sort(sortByCreatedAtDesc);

  return (
    orderedDeposits.find((deposit) => deposit?.status === 'COMPLETED') ||
    orderedDeposits.find((deposit) => deposit?.status === 'AWAITING_TRANSFER') ||
    orderedDeposits.find((deposit) => deposit?.status === 'ACTIVE') ||
    orderedDeposits[0] ||
    null
  );
}

function getLocalizedPeriodLabel(period, language) {
  if (!period) {
    return language === 'ru' ? '1 неделя' : '1 week';
  }

  const normalizedTitle = String(period.title || '').trim().toLowerCase();
  const normalizedType = String(period.period_type || '').trim().toLowerCase();

  if (normalizedType.includes('day') || normalizedTitle.includes('day') || normalizedTitle.includes('день')) {
    return language === 'ru' ? '1 день' : '1 day';
  }

  if (normalizedType.includes('week') || normalizedTitle.includes('week') || normalizedTitle.includes('нед')) {
    return language === 'ru' ? '1 неделя' : '1 week';
  }

  return period.title || (language === 'ru' ? '1 неделя' : '1 week');
}

function buildDepositMetricsSummary(deposit, period, trader, language) {
  const assetSymbol = deposit?.asset_symbol || 'USDT';

  return {
    traderName: trader?.display_name || trader?.nickname || (language === 'ru' ? 'Трейдер' : 'Trader'),
    periodLabel: getLocalizedPeriodLabel(period, language),
    profitLossValue: `0.00 ${assetSymbol}`,
    projectedBalanceValue: `0.00 ${assetSymbol}`,
    assistantTradesValue: '0',
    winRateValue: '0%',
  };
}

module.exports = {
  buildDepositMetricsSummary,
  getLocalizedPeriodLabel,
  pickLatestDeposit,
};
