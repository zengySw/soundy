CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID,
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL DEFAULT 'Unknown artist',
  album VARCHAR(255),
  year INTEGER,
  genre VARCHAR(120),
  duration_ms INTEGER,
  track_number INTEGER,
  is_explicit BOOLEAN NOT NULL DEFAULT FALSE,
  play_count INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL UNIQUE,
  cover_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_tracks_artist_id ON tracks (artist_id);
CREATE INDEX IF NOT EXISTS ix_tracks_created_at ON tracks (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_tracks_title_lower ON tracks ((lower(title)));

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_playlists_owner_name_unique
  ON playlists (owner_id, lower(name));

CREATE INDEX IF NOT EXISTS ix_playlists_owner_created_at
  ON playlists (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  position INTEGER,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS ix_playlist_tracks_track_id
  ON playlist_tracks (track_id);

CREATE OR REPLACE FUNCTION set_catalog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tracks_set_updated_at ON tracks;
CREATE TRIGGER trg_tracks_set_updated_at
BEFORE UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION set_catalog_updated_at();

DROP TRIGGER IF EXISTS trg_playlists_set_updated_at ON playlists;
CREATE TRIGGER trg_playlists_set_updated_at
BEFORE UPDATE ON playlists
FOR EACH ROW
EXECUTE FUNCTION set_catalog_updated_at();
