ALTER TABLE "Store"
ADD COLUMN "menu_language_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "store_menu_language_rules" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "match_text" TEXT NOT NULL,
  "replacement_text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_menu_language_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_menu_language_rules_store_id_match_text_key"
ON "store_menu_language_rules"("store_id", "match_text");

CREATE INDEX "store_menu_language_rules_store_id_idx"
ON "store_menu_language_rules"("store_id");

ALTER TABLE "store_menu_language_rules"
ADD CONSTRAINT "store_menu_language_rules_store_id_fkey"
FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
