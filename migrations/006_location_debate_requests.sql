-- Phase 5: Location-based debates + friend requests

-- Add location to users
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Debate requests (challenges)
CREATE TABLE IF NOT EXISTS debate_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  format TEXT DEFAULT 'Text',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, accepted, declined, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_debate_requests_to ON debate_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_debate_requests_from ON debate_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_debate_requests_status ON debate_requests(status, expires_at);

-- Notification preferences
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, read, created_at DESC);
