ALTER TABLE "EmploymentHistory"
ADD COLUMN IF NOT EXISTS "resignation_reason" TEXT,
ADD COLUMN IF NOT EXISTS "resignation_note" TEXT;
