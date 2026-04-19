-- Create trader directory
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';

CREATE TABLE "Trader" (
  "trader_id" TEXT NOT NULL,
  "nickname" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "description" TEXT,
  "profile_title" TEXT NOT NULL DEFAULT 'semper in motu ai',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Trader_pkey" PRIMARY KEY ("trader_id")
);

CREATE UNIQUE INDEX "Trader_nickname_key" ON "Trader"("nickname");
CREATE UNIQUE INDEX "Trader_slug_key" ON "Trader"("slug");

-- Create trader main addresses
CREATE TABLE "TraderMainAddress" (
  "trader_main_address_id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "asset_symbol" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TraderMainAddress_pkey" PRIMARY KEY ("trader_main_address_id")
);

CREATE INDEX "TraderMainAddress_trader_id_idx" ON "TraderMainAddress"("trader_id");
CREATE INDEX "TraderMainAddress_trader_id_network_asset_symbol_is_active_idx"
  ON "TraderMainAddress"("trader_id", "network", "asset_symbol", "is_active");

-- Only one active address per trader + network + asset
CREATE UNIQUE INDEX "TraderMainAddress_active_unique_idx"
  ON "TraderMainAddress"("trader_id", "network", "asset_symbol")
  WHERE "is_active" = true;

-- Extend deposits with legacy-safe trader links
ALTER TABLE "Deposit" ADD COLUMN "trader_id" TEXT NULL;
ALTER TABLE "Deposit" ADD COLUMN "trader_main_address_id" TEXT NULL;
ALTER TABLE "Deposit" ADD COLUMN "return_address" TEXT NULL;

CREATE INDEX "Deposit_trader_id_idx" ON "Deposit"("trader_id");
CREATE INDEX "Deposit_trader_main_address_id_idx" ON "Deposit"("trader_main_address_id");

ALTER TABLE "TraderMainAddress"
  ADD CONSTRAINT "TraderMainAddress_trader_id_fkey"
  FOREIGN KEY ("trader_id") REFERENCES "Trader"("trader_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deposit"
  ADD CONSTRAINT "Deposit_trader_id_fkey"
  FOREIGN KEY ("trader_id") REFERENCES "Trader"("trader_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deposit"
  ADD CONSTRAINT "Deposit_trader_main_address_id_fkey"
  FOREIGN KEY ("trader_main_address_id") REFERENCES "TraderMainAddress"("trader_main_address_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Trader-scoped reporting inside a shared period
CREATE TABLE "PeriodTraderReport" (
  "trader_report_id" TEXT NOT NULL,
  "investment_period_id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "ending_balance_usdt" DECIMAL(65,30),
  "trader_fee_percent" DECIMAL(65,30),
  "network_fees_json" JSONB,
  "generated_by" TEXT,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PeriodTraderReport_pkey" PRIMARY KEY ("trader_report_id")
);

CREATE UNIQUE INDEX "PeriodTraderReport_investment_period_id_trader_id_key"
  ON "PeriodTraderReport"("investment_period_id", "trader_id");
CREATE INDEX "PeriodTraderReport_investment_period_id_idx"
  ON "PeriodTraderReport"("investment_period_id");
CREATE INDEX "PeriodTraderReport_trader_id_idx"
  ON "PeriodTraderReport"("trader_id");

ALTER TABLE "PeriodTraderReport"
  ADD CONSTRAINT "PeriodTraderReport_investment_period_id_fkey"
  FOREIGN KEY ("investment_period_id") REFERENCES "InvestmentPeriod"("investment_period_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PeriodTraderReport"
  ADD CONSTRAINT "PeriodTraderReport_trader_id_fkey"
  FOREIGN KEY ("trader_id") REFERENCES "Trader"("trader_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Immutable payout registry per trader report
CREATE TABLE "PayoutRegistry" (
  "payout_registry_id" TEXT NOT NULL,
  "investment_period_id" TEXT NOT NULL,
  "trader_report_id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "generated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayoutRegistry_pkey" PRIMARY KEY ("payout_registry_id")
);

CREATE UNIQUE INDEX "PayoutRegistry_trader_report_id_key"
  ON "PayoutRegistry"("trader_report_id");
CREATE INDEX "PayoutRegistry_investment_period_id_idx"
  ON "PayoutRegistry"("investment_period_id");
CREATE INDEX "PayoutRegistry_trader_id_idx"
  ON "PayoutRegistry"("trader_id");

ALTER TABLE "PayoutRegistry"
  ADD CONSTRAINT "PayoutRegistry_investment_period_id_fkey"
  FOREIGN KEY ("investment_period_id") REFERENCES "InvestmentPeriod"("investment_period_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutRegistry"
  ADD CONSTRAINT "PayoutRegistry_trader_report_id_fkey"
  FOREIGN KEY ("trader_report_id") REFERENCES "PeriodTraderReport"("trader_report_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutRegistry"
  ADD CONSTRAINT "PayoutRegistry_trader_id_fkey"
  FOREIGN KEY ("trader_id") REFERENCES "Trader"("trader_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PayoutRegistryRow" (
  "payout_registry_row_id" TEXT NOT NULL,
  "payout_registry_id" TEXT NOT NULL,
  "investment_period_id" TEXT NOT NULL,
  "trader_report_id" TEXT NOT NULL,
  "deposit_id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "trader_nickname" TEXT NOT NULL,
  "network" TEXT NOT NULL,
  "asset_symbol" TEXT NOT NULL,
  "deposit_amount_usdt" DECIMAL(65,30) NOT NULL,
  "share_ratio" DECIMAL(65,30) NOT NULL,
  "payout_gross_usdt" DECIMAL(65,30) NOT NULL,
  "payout_fee_usdt" DECIMAL(65,30) NOT NULL,
  "payout_net_usdt" DECIMAL(65,30) NOT NULL,
  "default_payout_address" TEXT,
  "selected_payout_address" TEXT,
  "address_source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "tx_hash" TEXT,
  "paid_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PayoutRegistryRow_pkey" PRIMARY KEY ("payout_registry_row_id")
);

CREATE UNIQUE INDEX "PayoutRegistryRow_payout_registry_id_deposit_id_key"
  ON "PayoutRegistryRow"("payout_registry_id", "deposit_id");
CREATE INDEX "PayoutRegistryRow_investment_period_id_idx"
  ON "PayoutRegistryRow"("investment_period_id");
CREATE INDEX "PayoutRegistryRow_trader_report_id_idx"
  ON "PayoutRegistryRow"("trader_report_id");
CREATE INDEX "PayoutRegistryRow_deposit_id_idx"
  ON "PayoutRegistryRow"("deposit_id");
CREATE INDEX "PayoutRegistryRow_status_idx"
  ON "PayoutRegistryRow"("status");

ALTER TABLE "PayoutRegistryRow"
  ADD CONSTRAINT "PayoutRegistryRow_payout_registry_id_fkey"
  FOREIGN KEY ("payout_registry_id") REFERENCES "PayoutRegistry"("payout_registry_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutRegistryRow"
  ADD CONSTRAINT "PayoutRegistryRow_deposit_id_fkey"
  FOREIGN KEY ("deposit_id") REFERENCES "Deposit"("deposit_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayoutRegistryRow"
  ADD CONSTRAINT "PayoutRegistryRow_trader_id_fkey"
  FOREIGN KEY ("trader_id") REFERENCES "Trader"("trader_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
