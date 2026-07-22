CREATE TABLE IF NOT EXISTS matchmaker (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, matched, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_matchmaker_waiting ON matchmaker(status, category, created_at) WHERE status = 'waiting';
