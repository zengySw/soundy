CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_pk PRIMARY KEY (user_id, track_id),
  CONSTRAINT favorites_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT favorites_track_fk FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);