IF OBJECT_ID('dbo.favorites', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.favorites (
    user_id   UNIQUEIDENTIFIER NOT NULL,
    track_id  UNIQUEIDENTIFIER NOT NULL,
    added_at  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_favorites PRIMARY KEY (user_id, track_id),
    CONSTRAINT FK_favorites_user FOREIGN KEY (user_id) REFERENCES dbo.users(id),
    CONSTRAINT FK_favorites_track FOREIGN KEY (track_id) REFERENCES dbo.tracks(id)
  );
END
