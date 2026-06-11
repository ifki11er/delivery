CREATE TABLE IF NOT EXISTS "pos_side_menus" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_side_menus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_side_menus_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pos_menu_sides" (
  "id" TEXT NOT NULL,
  "menu_id" TEXT NOT NULL,
  "side_menu_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_menu_sides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_menu_sides_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pos_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pos_menu_sides_side_menu_id_fkey" FOREIGN KEY ("side_menu_id") REFERENCES "pos_side_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "pos_side_menus" (
  "id",
  "store_id",
  "name",
  "price",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  'side_' || md5(random()::text || clock_timestamp()::text || oi."id"),
  oi."store_id",
  oi."name",
  oi."price",
  oi."sort_order",
  oi."is_active",
  oi."created_at",
  oi."updated_at"
FROM "pos_option_items" oi
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'pos_option_items'
)
AND NOT EXISTS (
  SELECT 1
  FROM "pos_side_menus" existing
  WHERE existing."store_id" = oi."store_id"
    AND existing."name" = oi."name"
    AND existing."price" = oi."price"
);

INSERT INTO "pos_menu_sides" (
  "id",
  "menu_id",
  "side_menu_id",
  "sort_order",
  "created_at"
)
SELECT
  'menuside_' || md5(random()::text || clock_timestamp()::text || mog."menu_id" || sm."id"),
  mog."menu_id",
  sm."id",
  mog."sort_order",
  CURRENT_TIMESTAMP
FROM "pos_menu_option_groups" mog
JOIN "pos_option_items" oi ON oi."group_id" = mog."group_id"
JOIN "pos_side_menus" sm ON sm."store_id" = oi."store_id"
  AND sm."name" = oi."name"
  AND sm."price" = oi."price"
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'pos_menu_option_groups'
)
AND NOT EXISTS (
  SELECT 1
  FROM "pos_menu_sides" existing
  WHERE existing."menu_id" = mog."menu_id"
    AND existing."side_menu_id" = sm."id"
);

ALTER TABLE "pos_order_item_options" ADD COLUMN IF NOT EXISTS "side_menu_id" TEXT;

UPDATE "pos_order_item_options" oio
SET "side_menu_id" = (
  SELECT sm."id"
  FROM "pos_order_items" oi
  JOIN "pos_side_menus" sm ON sm."name" = oio."name"
    AND sm."price" = oio."price"
  WHERE oi."id" = oio."order_item_id"
    AND sm."store_id" = (
      SELECT po."store_id"
      FROM "pos_orders" po
      WHERE po."id" = oi."order_id"
      LIMIT 1
    )
  ORDER BY sm."sort_order" ASC, sm."created_at" ASC
  LIMIT 1
)
WHERE oio."side_menu_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_order_item_options_option_item_id_fkey'
  ) THEN
    ALTER TABLE "pos_order_item_options" DROP CONSTRAINT "pos_order_item_options_option_item_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_order_item_options_side_menu_id_fkey'
  ) THEN
    ALTER TABLE "pos_order_item_options"
      ADD CONSTRAINT "pos_order_item_options_side_menu_id_fkey"
      FOREIGN KEY ("side_menu_id") REFERENCES "pos_side_menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "pos_order_item_options" DROP COLUMN IF EXISTS "option_item_id";

DROP TABLE IF EXISTS "pos_menu_option_groups";
DROP TABLE IF EXISTS "pos_option_items";
DROP TABLE IF EXISTS "pos_option_groups";

CREATE INDEX IF NOT EXISTS "pos_side_menus_store_id_idx" ON "pos_side_menus"("store_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_menu_sides_menu_id_side_menu_id_key" ON "pos_menu_sides"("menu_id", "side_menu_id");
CREATE INDEX IF NOT EXISTS "pos_menu_sides_side_menu_id_idx" ON "pos_menu_sides"("side_menu_id");
