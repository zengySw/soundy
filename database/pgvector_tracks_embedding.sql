DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_available_extensions
    WHERE name = 'vector'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS vector;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tracks'
    ) THEN
      ALTER TABLE tracks
        ADD COLUMN IF NOT EXISTS embedding vector(1536);

      CREATE INDEX IF NOT EXISTS ix_tracks_embedding_ivfflat
        ON tracks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    END IF;
  END IF;
END
$$;
