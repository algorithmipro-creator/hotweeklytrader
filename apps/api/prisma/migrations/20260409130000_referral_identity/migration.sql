ALTER TABLE "User"
ADD COLUMN "referral_code" TEXT,
ADD COLUMN "referred_by_user_id" TEXT,
ADD COLUMN "referred_at" TIMESTAMP(3),
ADD COLUMN "referral_source" TEXT;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

UPDATE "User"
SET "referral_code" = upper(replace(gen_random_uuid()::text, '-', ''))
WHERE "referral_code" IS NULL;

CREATE UNIQUE INDEX "User_referral_code_key" ON "User"("referral_code");
CREATE INDEX "User_referred_by_user_id_idx" ON "User"("referred_by_user_id");

ALTER TABLE "User"
ADD CONSTRAINT "User_referred_by_user_id_fkey"
FOREIGN KEY ("referred_by_user_id") REFERENCES "User"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;
