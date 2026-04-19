export const DEFAULT_PAYOUT_THRESHOLD_USD = '5.00';

export function formatHeldBalanceValue(value: unknown, fallback = '0.00'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : fallback;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toFixed?: (digits: number) => string; toString?: () => string };

    if (typeof candidate.toFixed === 'function') {
      try {
        return candidate.toFixed(2);
      } catch {
        // Fall through to string conversion.
      }
    }

    if (typeof candidate.toString === 'function') {
      const stringified = candidate.toString();
      const parsed = Number(stringified);
      return Number.isFinite(parsed) ? parsed.toFixed(2) : stringified;
    }
  }

  const stringified = String(value);
  const parsed = Number(stringified);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : stringified;
}

export function serializeHeldBalanceSummary(source: {
  held_cycle_balance_bsc?: unknown;
  held_cycle_balance_ton?: unknown;
  held_referral_balance_bsc?: unknown;
  held_referral_balance_ton?: unknown;
  payout_threshold_usd?: unknown;
}) {
  return {
    held_cycle_balance_bsc: formatHeldBalanceValue(source.held_cycle_balance_bsc),
    held_cycle_balance_ton: formatHeldBalanceValue(source.held_cycle_balance_ton),
    held_referral_balance_bsc: formatHeldBalanceValue(source.held_referral_balance_bsc),
    held_referral_balance_ton: formatHeldBalanceValue(source.held_referral_balance_ton),
    payout_threshold_usd: formatHeldBalanceValue(
      source.payout_threshold_usd,
      DEFAULT_PAYOUT_THRESHOLD_USD,
    ),
  };
}
