CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  artist varchar(255),
  year int,
  cover_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);