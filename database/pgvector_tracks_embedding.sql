CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS ix_tracks_embedding_ivfflat
  ON tracks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
