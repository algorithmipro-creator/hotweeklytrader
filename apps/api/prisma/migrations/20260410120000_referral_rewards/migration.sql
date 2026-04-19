CREATE TYPE "ReferralRewardType" AS ENUM ('FIRST_DEPOSIT', 'PERIOD_PROFIT');

CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'APPROVED', 'SETTLED', 'CANCELLED');

CREATE TABLE "ReferralReward" (
  "referral_reward_id" TEXT NOT NULL,
  "beneficiary_user_id" TEXT NOT NULL,
  "source_user_id" TEXT NOT NULL,
  "source_deposit_id" TEXT NOT NULL,
  "source_report_id" TEXT,
  "investment_period_id" TEXT NOT NULL,
  "referral_level" INTEGER NOT NULL,
  "reward_type" "ReferralRewardType" NOT NULL,
  "base_amount" DECIMAL(65,30) NOT NULL,
  "reward_percent" DECIMAL(65,30) NOT NULL,
  "reward_amount" DECIMAL(65,30) NOT NULL,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settled_at" TIMESTAMP(3),
  "metadata_json" JSONB,

  CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("referral_reward_id")
);

CREATE UNIQUE INDEX "ReferralReward_beneficiary_user_id_source_deposit_id_reward_type_key"
ON "ReferralReward"("beneficiary_user_id", "source_deposit_id", "reward_type");

CREATE INDEX "ReferralReward_source_user_id_idx" ON "ReferralReward"("source_user_id");
CREATE INDEX "ReferralReward_investment_period_id_idx" ON "ReferralReward"("investment_period_id");
CREATE INDEX "ReferralReward_status_idx" ON "ReferralReward"("status");
CREATE INDEX "ReferralReward_reward_type_idx" ON "ReferralReward"("reward_type");

ALTER TABLE "ReferralReward"
ADD CONSTRAINT "ReferralReward_beneficiary_user_id_fkey"
FOREIGN KEY ("beneficiary_user_id") REFERENCES "User"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward"
ADD CONSTRAINT "ReferralReward_source_user_id_fkey"
FOREIGN KEY ("source_user_id") REFERENCES "User"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward"
ADD CONSTRAINT "ReferralReward_source_deposit_id_fkey"
FOREIGN KEY ("source_deposit_id") REFERENCES "Deposit"("deposit_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward"
ADD CONSTRAINT "ReferralReward_source_report_id_fkey"
FOREIGN KEY ("source_report_id") REFERENCES "ProfitLossReport"("report_id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralReward"
ADD CONSTRAINT "ReferralReward_investment_period_id_fkey"
FOREIGN KEY ("investment_period_id") REFERENCES "InvestmentPeriod"("investment_period_id")
ON DELETE CASCADE ON UPDATE CASCADE;
