ALTER TABLE "Store"
ADD COLUMN IF NOT EXISTS "menu_language_mode" TEXT NOT NULL DEFAULT 'KOREAN_ONLY';

UPDATE "Store"
SET "menu_language_mode" = CASE
  WHEN "menu_language_enabled" = TRUE THEN 'FOREIGN_ONLY'
  ELSE 'KOREAN_ONLY'
END
WHERE "menu_language_mode" IS NULL OR "menu_language_mode" = 'KOREAN_ONLY';
