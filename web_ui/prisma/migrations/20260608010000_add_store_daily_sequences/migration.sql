CREATE TABLE IF NOT EXISTS store_daily_sequences (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  business_date TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_daily_sequences_store_date_key
  ON store_daily_sequences(store_id, business_date);
