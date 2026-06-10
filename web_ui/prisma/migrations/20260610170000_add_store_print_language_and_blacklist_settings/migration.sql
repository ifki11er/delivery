ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "mini_receipt_language_mode" TEXT NOT NULL DEFAULT 'KOREAN_ONLY';
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "delivery_blacklist_check_enabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "store_menu_language_rules" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'DELIVERY';

DROP INDEX IF EXISTS "store_menu_language_rules_store_id_match_text_key";
CREATE UNIQUE INDEX IF NOT EXISTS "store_menu_language_rules_store_id_scope_match_text_key"
  ON "store_menu_language_rules"("store_id", "scope", "match_text");
