CREATE TABLE IF NOT EXISTS "pos_option_groups" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "selection_type" TEXT NOT NULL DEFAULT 'SINGLE',
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "min_select" INTEGER NOT NULL DEFAULT 0,
  "max_select" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_option_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_option_groups_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pos_option_items" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_option_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_option_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pos_option_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pos_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pos_menu_option_groups" (
  "id" TEXT NOT NULL,
  "menu_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_menu_option_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_menu_option_groups_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "pos_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pos_menu_option_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pos_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pos_order_item_options" (
  "id" TEXT NOT NULL,
  "order_item_id" TEXT NOT NULL,
  "option_item_id" TEXT,
  "group_name" TEXT NOT NULL DEFAULT '',
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pos_order_item_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_order_item_options_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "pos_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pos_order_item_options_option_item_id_fkey" FOREIGN KEY ("option_item_id") REFERENCES "pos_option_items"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pos_option_groups_store_id_idx" ON "pos_option_groups"("store_id");
CREATE INDEX IF NOT EXISTS "pos_option_items_store_id_idx" ON "pos_option_items"("store_id");
CREATE INDEX IF NOT EXISTS "pos_option_items_group_id_idx" ON "pos_option_items"("group_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_menu_option_groups_menu_id_group_id_key" ON "pos_menu_option_groups"("menu_id", "group_id");
CREATE INDEX IF NOT EXISTS "pos_menu_option_groups_group_id_idx" ON "pos_menu_option_groups"("group_id");
CREATE INDEX IF NOT EXISTS "pos_order_item_options_order_item_id_idx" ON "pos_order_item_options"("order_item_id");
