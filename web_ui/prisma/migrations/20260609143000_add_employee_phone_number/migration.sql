ALTER TABLE "Employee"
ADD COLUMN IF NOT EXISTS "phone_number" TEXT;

UPDATE "Employee" AS e
SET "phone_number" = u."phoneNumber"
FROM "User" AS u
WHERE e."userId" = u."id"
  AND e."phone_number" IS NULL
  AND u."phoneNumber" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Employee_phone_number_idx" ON "Employee"("phone_number");
