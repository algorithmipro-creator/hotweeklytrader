DO $$
BEGIN
  CREATE TYPE "SettlementPreference" AS ENUM ('WITHDRAW_ALL', 'REINVEST_PRINCIPAL', 'REINVEST_ALL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReferralPayoutPreference" AS ENUM ('WITHDRAW', 'HOLD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "referral_payout_preference" "ReferralPayoutPreference" NOT NULL DEFAULT 'WITHDRAW',
  ADD COLUMN IF NOT EXISTS "held_referral_balance_bsc" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "held_referral_balance_ton" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "held_cycle_balance_bsc" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "held_cycle_balance_ton" DECIMAL NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payout_threshold_usd" DECIMAL NOT NULL DEFAULT 5;

ALTER TABLE "Deposit"
  ADD COLUMN IF NOT EXISTS "settlement_preference" "SettlementPreference" NOT NULL DEFAULT 'WITHDRAW_ALL',
  ADD COLUMN IF NOT EXISTS "auto_renew_trader_id_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "auto_renew_network_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "auto_renew_asset_symbol_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "rolled_over_into_deposit_id" TEXT,
  ADD COLUMN IF NOT EXISTS "rollover_source_deposit_id" TEXT,
  ADD COLUMN IF NOT EXISTS "rollover_attempted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rollover_block_reason" TEXT;
