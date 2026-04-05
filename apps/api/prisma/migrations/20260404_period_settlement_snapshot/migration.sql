CREATE TABLE "PeriodSettlementSnapshot" (
  "settlement_snapshot_id" TEXT NOT NULL,
  "investment_period_id" TEXT NOT NULL,
  "ending_balance_usdt" DECIMAL(65,30) NOT NULL,
  "total_deposits_usdt" DECIMAL(65,30) NOT NULL,
  "gross_pnl_usdt" DECIMAL(65,30) NOT NULL,
  "trader_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 40,
  "trader_fee_usdt" DECIMAL(65,30) NOT NULL,
  "network_fees_json" JSONB NOT NULL,
  "net_distributable_usdt" DECIMAL(65,30) NOT NULL,
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  "approved_by" TEXT,

  CONSTRAINT "PeriodSettlementSnapshot_pkey" PRIMARY KEY ("settlement_snapshot_id"),
  CONSTRAINT "PeriodSettlementSnapshot_investment_period_id_key" UNIQUE ("investment_period_id"),
  CONSTRAINT "PeriodSettlementSnapshot_investment_period_id_fkey"
    FOREIGN KEY ("investment_period_id")
    REFERENCES "InvestmentPeriod" ("investment_period_id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "PeriodSettlementSnapshot_investment_period_id_idx"
  ON "PeriodSettlementSnapshot" ("investment_period_id");

CREATE INDEX "PeriodSettlementSnapshot_approved_at_idx"
  ON "PeriodSettlementSnapshot" ("approved_at");
