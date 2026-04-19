CREATE TABLE "PendingReferralAttribution" (
  "pending_referral_attribution_id" TEXT NOT NULL,
  "telegram_id" BIGINT NOT NULL,
  "referral_code" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "consumed_by_user_id" TEXT,

  CONSTRAINT "PendingReferralAttribution_pkey" PRIMARY KEY ("pending_referral_attribution_id")
);

CREATE UNIQUE INDEX "PendingReferralAttribution_telegram_id_key" ON "PendingReferralAttribution"("telegram_id");
CREATE INDEX "PendingReferralAttribution_expires_at_idx" ON "PendingReferralAttribution"("expires_at");
CREATE INDEX "PendingReferralAttribution_consumed_by_user_id_idx" ON "PendingReferralAttribution"("consumed_by_user_id");

ALTER TABLE "PendingReferralAttribution"
ADD CONSTRAINT "PendingReferralAttribution_consumed_by_user_id_fkey"
FOREIGN KEY ("consumed_by_user_id") REFERENCES "User"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;
