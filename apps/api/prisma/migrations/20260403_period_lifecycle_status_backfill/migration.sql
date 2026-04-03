DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InvestmentPeriodStatus' AND e.enumlabel = 'DRAFT'
  ) THEN
    EXECUTE 'ALTER TYPE "InvestmentPeriodStatus" RENAME VALUE ''DRAFT'' TO ''FUNDING''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InvestmentPeriodStatus' AND e.enumlabel = 'ACTIVE'
  ) THEN
    EXECUTE 'ALTER TYPE "InvestmentPeriodStatus" RENAME VALUE ''ACTIVE'' TO ''TRADING_ACTIVE''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InvestmentPeriodStatus' AND e.enumlabel = 'LOCKED'
  ) THEN
    EXECUTE 'ALTER TYPE "InvestmentPeriodStatus" RENAME VALUE ''LOCKED'' TO ''REPORTING''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InvestmentPeriodStatus' AND e.enumlabel = 'COMPLETED'
  ) THEN
    EXECUTE 'ALTER TYPE "InvestmentPeriodStatus" RENAME VALUE ''COMPLETED'' TO ''PAYOUT_IN_PROGRESS''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'InvestmentPeriodStatus' AND e.enumlabel = 'ARCHIVED'
  ) THEN
    EXECUTE 'ALTER TYPE "InvestmentPeriodStatus" RENAME VALUE ''ARCHIVED'' TO ''CLOSED''';
  END IF;
END $$;

ALTER TABLE "InvestmentPeriod"
  ALTER COLUMN "status" SET DEFAULT 'FUNDING';
