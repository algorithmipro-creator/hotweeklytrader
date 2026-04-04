DO $$
BEGIN
  IF to_regclass('"InvestmentPeriod"') IS NOT NULL
     AND to_regclass('"PeriodSettlementSnapshot"') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "PeriodPayoutRegistry" (
      "payout_registry_id" TEXT NOT NULL,
      "investment_period_id" TEXT NOT NULL,
      "settlement_snapshot_id" TEXT NOT NULL,
      "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "generated_by" TEXT,

      CONSTRAINT "PeriodPayoutRegistry_pkey" PRIMARY KEY ("payout_registry_id"),
      CONSTRAINT "PeriodPayoutRegistry_investment_period_id_key" UNIQUE ("investment_period_id"),
      CONSTRAINT "PeriodPayoutRegistry_settlement_snapshot_id_key" UNIQUE ("settlement_snapshot_id"),
      CONSTRAINT "PeriodPayoutRegistry_investment_period_id_fkey"
        FOREIGN KEY ("investment_period_id")
        REFERENCES "InvestmentPeriod" ("investment_period_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT "PeriodPayoutRegistry_settlement_snapshot_id_fkey"
        FOREIGN KEY ("settlement_snapshot_id")
        REFERENCES "PeriodSettlementSnapshot" ("settlement_snapshot_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"PeriodPayoutRegistry"') IS NOT NULL
     AND to_regclass('"Deposit"') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS "PeriodPayoutRegistryItem" (
      "payout_registry_item_id" TEXT NOT NULL,
      "payout_registry_id" TEXT NOT NULL,
      "deposit_id" TEXT NOT NULL,
      "network" TEXT NOT NULL,
      "asset_symbol" TEXT NOT NULL,
      "confirmed_amount_usdt" DECIMAL(65,30) NOT NULL,
      "network_fee_bucket_usdt" DECIMAL(65,30) NOT NULL,
      "network_fee_allocation_usdt" DECIMAL(65,30) NOT NULL,
      "payout_amount_usdt" DECIMAL(65,30) NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "PeriodPayoutRegistryItem_pkey" PRIMARY KEY ("payout_registry_item_id"),
      CONSTRAINT "PeriodPayoutRegistryItem_payout_registry_id_deposit_id_key" UNIQUE ("payout_registry_id", "deposit_id"),
      CONSTRAINT "PeriodPayoutRegistryItem_payout_registry_id_fkey"
        FOREIGN KEY ("payout_registry_id")
        REFERENCES "PeriodPayoutRegistry" ("payout_registry_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,
      CONSTRAINT "PeriodPayoutRegistryItem_deposit_id_fkey"
        FOREIGN KEY ("deposit_id")
        REFERENCES "Deposit" ("deposit_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"PeriodPayoutRegistry"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistry_investment_period_id_idx"
      ON "PeriodPayoutRegistry" ("investment_period_id");
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistry_settlement_snapshot_id_idx"
      ON "PeriodPayoutRegistry" ("settlement_snapshot_id");
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistry_generated_at_idx"
      ON "PeriodPayoutRegistry" ("generated_at");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"PeriodPayoutRegistryItem"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistryItem_payout_registry_id_idx"
      ON "PeriodPayoutRegistryItem" ("payout_registry_id");
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistryItem_deposit_id_idx"
      ON "PeriodPayoutRegistryItem" ("deposit_id");
    CREATE INDEX IF NOT EXISTS "PeriodPayoutRegistryItem_network_idx"
      ON "PeriodPayoutRegistryItem" ("network");
  END IF;
END $$;
