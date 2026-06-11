CREATE TABLE IF NOT EXISTS "pos_side_categories" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_side_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_side_categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "pos_side_categories" ("id", "store_id", "name", "sort_order", "created_at", "updated_at")
SELECT
  'sidecat_' || md5(random()::text || clock_timestamp()::text || side_store."store_id"),
  side_store."store_id",
  '기본',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "store_id"
  FROM "pos_side_menus"
) side_store
WHERE NOT EXISTS (
  SELECT 1
  FROM "pos_side_categories" existing
  WHERE existing."store_id" = side_store."store_id"
);

ALTER TABLE "pos_side_menus" ADD COLUMN IF NOT EXISTS "category_id" TEXT;

UPDATE "pos_side_menus" side
SET "category_id" = (
  SELECT category."id"
  FROM "pos_side_categories" category
  WHERE category."store_id" = side."store_id"
  ORDER BY category."sort_order" ASC, category."created_at" ASC
  LIMIT 1
)
WHERE side."category_id" IS NULL;

ALTER TABLE "pos_side_menus" ALTER COLUMN "category_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_side_menus_category_id_fkey'
  ) THEN
    ALTER TABLE "pos_side_menus"
      ADD CONSTRAINT "pos_side_menus_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "pos_side_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pos_side_categories_store_id_idx" ON "pos_side_categories"("store_id");
CREATE INDEX IF NOT EXISTS "pos_side_menus_category_id_idx" ON "pos_side_menus"("category_id");
