export enum SettlementPreferenceValue {
  WITHDRAW_ALL = 'WITHDRAW_ALL',
  REINVEST_PRINCIPAL = 'REINVEST_PRINCIPAL',
  REINVEST_ALL = 'REINVEST_ALL',
}

export enum ReferralPayoutPreferenceValue {
  WITHDRAW = 'WITHDRAW',
  HOLD = 'HOLD',
}

export const SETTLEMENT_PREFERENCE_VALUES = Object.values(SettlementPreferenceValue);
export const REFERRAL_PAYOUT_PREFERENCE_VALUES = Object.values(ReferralPayoutPreferenceValue);

export const DEFAULT_SETTLEMENT_PREFERENCE = SettlementPreferenceValue.WITHDRAW_ALL;
export const DEFAULT_REFERRAL_PAYOUT_PREFERENCE = ReferralPayoutPreferenceValue.WITHDRAW;

export function parseSettlementPreference(
  value?: string | null,
): SettlementPreferenceValue | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return SETTLEMENT_PREFERENCE_VALUES.includes(normalized as SettlementPreferenceValue)
    ? (normalized as SettlementPreferenceValue)
    : null;
}

export function normalizeSettlementPreference(
  value?: string | null,
): SettlementPreferenceValue {
  return parseSettlementPreference(value) ?? DEFAULT_SETTLEMENT_PREFERENCE;
}

export function parseReferralPayoutPreference(
  value?: string | null,
): ReferralPayoutPreferenceValue | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return REFERRAL_PAYOUT_PREFERENCE_VALUES.includes(normalized as ReferralPayoutPreferenceValue)
    ? (normalized as ReferralPayoutPreferenceValue)
    : null;
}

export function normalizeReferralPayoutPreference(
  value?: string | null,
): ReferralPayoutPreferenceValue {
  return parseReferralPayoutPreference(value) ?? DEFAULT_REFERRAL_PAYOUT_PREFERENCE;
}
