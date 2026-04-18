CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE playlist_tracks
  ADD COLUMN IF NOT EXISTS position INTEGER;

CREATE TABLE IF NOT EXISTS playlist_collaborators (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, user_id)
);

CREATE TABLE IF NOT EXISTS playlist_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_playlist_tracks_playlist_position
  ON playlist_tracks (playlist_id, position, added_at DESC);

CREATE INDEX IF NOT EXISTS ix_playlist_collaborators_user_id
  ON playlist_collaborators (user_id);

CREATE INDEX IF NOT EXISTS ix_playlist_invites_playlist_created_at
  ON playlist_invites (playlist_id, created_at DESC);
