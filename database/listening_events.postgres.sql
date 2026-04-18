CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS listening_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  source TEXT,
  country_code VARCHAR(8),
  city TEXT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_listening_events_artist_played_at
  ON listening_events (artist_id, played_at DESC);

CREATE INDEX IF NOT EXISTS ix_listening_events_track_played_at
  ON listening_events (track_id, played_at DESC);

CREATE INDEX IF NOT EXISTS ix_listening_events_user_played_at
  ON listening_events (user_id, played_at DESC);
