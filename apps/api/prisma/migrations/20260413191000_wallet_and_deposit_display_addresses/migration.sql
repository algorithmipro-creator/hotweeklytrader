ALTER TABLE "Wallet"
  ADD COLUMN IF NOT EXISTS "display_address" TEXT;

ALTER TABLE "Deposit"
  ADD COLUMN IF NOT EXISTS "source_address_display" TEXT,
  ADD COLUMN IF NOT EXISTS "return_address_display" TEXT;

UPDATE "Wallet"
SET "display_address" = "source_address"
WHERE "display_address" IS NULL
  AND "network" <> 'TON';

UPDATE "Deposit"
SET "source_address_display" = "source_address"
WHERE "source_address" IS NOT NULL
  AND "source_address_display" IS NULL
  AND "network" <> 'TON';

UPDATE "Deposit"
SET "return_address_display" = "return_address"
WHERE "return_address" IS NOT NULL
  AND "return_address_display" IS NULL
  AND "network" <> 'TON';
