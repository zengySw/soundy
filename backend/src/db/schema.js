const schemaStatements = [
  `
  IF OBJECT_ID(N'dbo.users', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.users (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_users PRIMARY KEY
        CONSTRAINT DF_users_id DEFAULT NEWID(),
      username NVARCHAR(50) NOT NULL,
      email NVARCHAR(255) NOT NULL,
      password_hash NVARCHAR(MAX) NOT NULL,
      avatar_url NVARCHAR(500) NULL,
      is_premium BIT NOT NULL CONSTRAINT DF_users_is_premium DEFAULT (0),
      country_code CHAR(2) NULL,
      is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.albums', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.albums (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_albums PRIMARY KEY
        CONSTRAINT DF_albums_id DEFAULT NEWID(),
      title NVARCHAR(255) NOT NULL,
      artist NVARCHAR(255) NULL,
      year INT NULL,
      cover_path NVARCHAR(500) NULL,
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_albums_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.artists', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.artists (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_artists PRIMARY KEY
        CONSTRAINT DF_artists_id DEFAULT NEWID(),
      name NVARCHAR(255) NOT NULL,
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_artists_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.tracks', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.tracks (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_tracks PRIMARY KEY
        CONSTRAINT DF_tracks_id DEFAULT NEWID(),
      album_id UNIQUEIDENTIFIER NULL,
      title NVARCHAR(255) NOT NULL,
      duration_ms INT NULL,
      track_number INT NULL,
      is_explicit BIT NOT NULL CONSTRAINT DF_tracks_is_explicit DEFAULT (0),
      play_count INT NOT NULL CONSTRAINT DF_tracks_play_count DEFAULT (0),
      path NVARCHAR(500) NULL,
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_tracks_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.playlists', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.playlists (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_playlists PRIMARY KEY
        CONSTRAINT DF_playlists_id DEFAULT NEWID(),
      owner_id UNIQUEIDENTIFIER NOT NULL,
      name NVARCHAR(255) NOT NULL,
      description NVARCHAR(255) NULL,
      is_public BIT NOT NULL CONSTRAINT DF_playlists_is_public DEFAULT (0),
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_playlists_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.user_sessions', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.user_sessions (
      id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_user_sessions PRIMARY KEY
        CONSTRAINT DF_user_sessions_id DEFAULT NEWID(),
      user_id UNIQUEIDENTIFIER NOT NULL,
      device_info NVARCHAR(255) NOT NULL,
      refresh_token NVARCHAR(255) NOT NULL,
      expires_at DATETIME2(0) NOT NULL,
      last_used_at DATETIME2(0) NOT NULL,
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_user_sessions_created_at DEFAULT SYSUTCDATETIME()
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.admins', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.admins (
      user_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_admins PRIMARY KEY,
      role NVARCHAR(50) NOT NULL CONSTRAINT DF_admins_role DEFAULT N'admin',
      granted_at DATETIME2(0) NOT NULL CONSTRAINT DF_admins_granted_at DEFAULT SYSUTCDATETIME(),
      granted_by UNIQUEIDENTIFIER NULL,
      note NVARCHAR(255) NULL
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.track_artists', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.track_artists (
      track_id UNIQUEIDENTIFIER NOT NULL,
      artist_id UNIQUEIDENTIFIER NOT NULL,
      is_main_artist BIT NOT NULL CONSTRAINT DF_track_artists_is_main_artist DEFAULT (0),
      created_at DATETIME2(0) NOT NULL CONSTRAINT DF_track_artists_created_at DEFAULT SYSUTCDATETIME(),
      CONSTRAINT PK_track_artists PRIMARY KEY (track_id, artist_id)
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.playlist_tracks', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.playlist_tracks (
      playlist_id UNIQUEIDENTIFIER NOT NULL,
      track_id UNIQUEIDENTIFIER NOT NULL,
      added_at DATETIME2(0) NOT NULL CONSTRAINT DF_playlist_tracks_added_at DEFAULT SYSUTCDATETIME(),
      CONSTRAINT PK_playlist_tracks PRIMARY KEY (playlist_id, track_id)
    );
  END
  `,
  `
  IF OBJECT_ID(N'dbo.favorites', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.favorites (
      user_id UNIQUEIDENTIFIER NOT NULL,
      track_id UNIQUEIDENTIFIER NOT NULL,
      added_at DATETIME2(0) NOT NULL CONSTRAINT DF_favorites_added_at DEFAULT SYSUTCDATETIME(),
      CONSTRAINT PK_favorites PRIMARY KEY (user_id, track_id)
    );
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_tracks_album'
      AND parent_object_id = OBJECT_ID(N'dbo.tracks')
  )
  BEGIN
    ALTER TABLE dbo.tracks
    ADD CONSTRAINT FK_tracks_album
      FOREIGN KEY (album_id) REFERENCES dbo.albums(id)
      ON DELETE SET NULL;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_playlists_owner'
      AND parent_object_id = OBJECT_ID(N'dbo.playlists')
  )
  BEGIN
    ALTER TABLE dbo.playlists
    ADD CONSTRAINT FK_playlists_owner
      FOREIGN KEY (owner_id) REFERENCES dbo.users(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_user_sessions_user'
      AND parent_object_id = OBJECT_ID(N'dbo.user_sessions')
  )
  BEGIN
    ALTER TABLE dbo.user_sessions
    ADD CONSTRAINT FK_user_sessions_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_admins_user'
      AND parent_object_id = OBJECT_ID(N'dbo.admins')
  )
  BEGIN
    ALTER TABLE dbo.admins
    ADD CONSTRAINT FK_admins_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_admins_granted_by'
      AND parent_object_id = OBJECT_ID(N'dbo.admins')
  )
  BEGIN
    ALTER TABLE dbo.admins
    ADD CONSTRAINT FK_admins_granted_by
      FOREIGN KEY (granted_by) REFERENCES dbo.users(id)
      ON DELETE SET NULL;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_track_artists_track'
      AND parent_object_id = OBJECT_ID(N'dbo.track_artists')
  )
  BEGIN
    ALTER TABLE dbo.track_artists
    ADD CONSTRAINT FK_track_artists_track
      FOREIGN KEY (track_id) REFERENCES dbo.tracks(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_track_artists_artist'
      AND parent_object_id = OBJECT_ID(N'dbo.track_artists')
  )
  BEGIN
    ALTER TABLE dbo.track_artists
    ADD CONSTRAINT FK_track_artists_artist
      FOREIGN KEY (artist_id) REFERENCES dbo.artists(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_playlist_tracks_playlist'
      AND parent_object_id = OBJECT_ID(N'dbo.playlist_tracks')
  )
  BEGIN
    ALTER TABLE dbo.playlist_tracks
    ADD CONSTRAINT FK_playlist_tracks_playlist
      FOREIGN KEY (playlist_id) REFERENCES dbo.playlists(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_playlist_tracks_track'
      AND parent_object_id = OBJECT_ID(N'dbo.playlist_tracks')
  )
  BEGIN
    ALTER TABLE dbo.playlist_tracks
    ADD CONSTRAINT FK_playlist_tracks_track
      FOREIGN KEY (track_id) REFERENCES dbo.tracks(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_favorites_user'
      AND parent_object_id = OBJECT_ID(N'dbo.favorites')
  )
  BEGIN
    ALTER TABLE dbo.favorites
    ADD CONSTRAINT FK_favorites_user
      FOREIGN KEY (user_id) REFERENCES dbo.users(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_favorites_track'
      AND parent_object_id = OBJECT_ID(N'dbo.favorites')
  )
  BEGIN
    ALTER TABLE dbo.favorites
    ADD CONSTRAINT FK_favorites_track
      FOREIGN KEY (track_id) REFERENCES dbo.tracks(id)
      ON DELETE CASCADE;
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_users_email'
      AND object_id = OBJECT_ID(N'dbo.users')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_users_email ON dbo.users(email);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_user_sessions_refresh_token'
      AND object_id = OBJECT_ID(N'dbo.user_sessions')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_user_sessions_refresh_token ON dbo.user_sessions(refresh_token);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_user_sessions_user_id'
      AND object_id = OBJECT_ID(N'dbo.user_sessions')
  )
  BEGIN
    CREATE INDEX IX_user_sessions_user_id ON dbo.user_sessions(user_id);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_tracks_album_id'
      AND object_id = OBJECT_ID(N'dbo.tracks')
  )
  BEGIN
    CREATE INDEX IX_tracks_album_id ON dbo.tracks(album_id);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_tracks_path'
      AND object_id = OBJECT_ID(N'dbo.tracks')
  )
  BEGIN
    CREATE INDEX IX_tracks_path ON dbo.tracks(path);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_playlists_owner_name'
      AND object_id = OBJECT_ID(N'dbo.playlists')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_playlists_owner_name ON dbo.playlists(owner_id, name);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_artists_name'
      AND object_id = OBJECT_ID(N'dbo.artists')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_artists_name ON dbo.artists(name);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_track_artists_artist_id'
      AND object_id = OBJECT_ID(N'dbo.track_artists')
  )
  BEGIN
    CREATE INDEX IX_track_artists_artist_id ON dbo.track_artists(artist_id);
  END
  `,
  `
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_playlist_tracks_track_id'
      AND object_id = OBJECT_ID(N'dbo.playlist_tracks')
  )
  BEGIN
    CREATE INDEX IX_playlist_tracks_track_id ON dbo.playlist_tracks(track_id);
  END
  `,
];

export async function ensureDatabaseSchema(pool) {
  for (const statement of schemaStatements) {
    await pool.request().batch(statement);
  }
}
