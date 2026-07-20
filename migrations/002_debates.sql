CREATE TABLE IF NOT EXISTS debates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  topic TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'text',
  created_by TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  opponent_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debate_arguments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  round INTEGER NOT NULL,
  side TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debate_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  debate_id TEXT NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  winner_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  scores JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
