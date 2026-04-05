ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';

UPDATE "User"
SET "role" = 'USER'
WHERE "role" IS NULL;

