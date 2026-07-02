ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "delivery_blacklist_check_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User" AS u
SET "delivery_blacklist_check_enabled" = false
WHERE EXISTS (
  SELECT 1
  FROM "Store" AS s
  WHERE s."ownerId" = u."id"
    AND s."delivery_blacklist_check_enabled" = false
);

ALTER TABLE "Store" DROP COLUMN IF EXISTS "delivery_blacklist_check_enabled";
