-- Phase 3: Ranks & Achievements

-- Add xp and rank columns to "user" table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Bronze';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;

-- User achievements (earned badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- Debate XP rewards log
CREATE TABLE IF NOT EXISTS xp_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  debate_id TEXT REFERENCES debates(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_log_user ON xp_log(user_id);
