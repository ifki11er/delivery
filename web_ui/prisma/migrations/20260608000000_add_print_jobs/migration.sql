CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'DELIVERY_SHARE',
  status TEXT NOT NULL DEFAULT 'PRINTED',
  raw_text TEXT NOT NULL,
  parsed_data TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS print_jobs_store_created_idx ON print_jobs(store_id, created_at);
CREATE INDEX IF NOT EXISTS print_jobs_user_created_idx ON print_jobs(user_id, created_at);
