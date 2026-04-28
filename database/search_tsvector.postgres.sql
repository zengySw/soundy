CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tracks'
  ) THEN
    ALTER TABLE public.tracks
      ADD COLUMN IF NOT EXISTS search_vector tsvector;

    CREATE OR REPLACE FUNCTION public.tracks_search_vector_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.search_vector := to_tsvector(
        'simple',
        concat_ws(
          ' ',
          COALESCE(to_jsonb(NEW) ->> 'title', ''),
          COALESCE(to_jsonb(NEW) ->> 'genre', '')
        )
      );
      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_tracks_search_vector ON public.tracks;
    CREATE TRIGGER trg_tracks_search_vector
    BEFORE INSERT OR UPDATE ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.tracks_search_vector_update();

    UPDATE public.tracks AS t
    SET search_vector = to_tsvector(
      'simple',
      concat_ws(
        ' ',
        COALESCE(to_jsonb(t) ->> 'title', ''),
        COALESCE(to_jsonb(t) ->> 'genre', '')
      )
    );

    CREATE INDEX IF NOT EXISTS ix_tracks_search_vector_gin
      ON public.tracks
      USING gin (search_vector);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'artists'
  ) THEN
    ALTER TABLE public.artists
      ADD COLUMN IF NOT EXISTS search_vector tsvector;

    CREATE OR REPLACE FUNCTION public.artists_search_vector_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.search_vector := to_tsvector(
        'simple',
        COALESCE(to_jsonb(NEW) ->> 'name', '')
      );
      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_artists_search_vector ON public.artists;
    CREATE TRIGGER trg_artists_search_vector
    BEFORE INSERT OR UPDATE ON public.artists
    FOR EACH ROW
    EXECUTE FUNCTION public.artists_search_vector_update();

    UPDATE public.artists AS a
    SET search_vector = to_tsvector(
      'simple',
      COALESCE(to_jsonb(a) ->> 'name', '')
    );

    CREATE INDEX IF NOT EXISTS ix_artists_search_vector_gin
      ON public.artists
      USING gin (search_vector);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'playlists'
  ) THEN
    ALTER TABLE public.playlists
      ADD COLUMN IF NOT EXISTS search_vector tsvector;

    CREATE OR REPLACE FUNCTION public.playlists_search_vector_update()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.search_vector := to_tsvector(
        'simple',
        concat_ws(
          ' ',
          COALESCE(to_jsonb(NEW) ->> 'title', to_jsonb(NEW) ->> 'name', ''),
          COALESCE(to_jsonb(NEW) ->> 'description', '')
        )
      );
      RETURN NEW;
    END;
    $function$;

    DROP TRIGGER IF EXISTS trg_playlists_search_vector ON public.playlists;
    CREATE TRIGGER trg_playlists_search_vector
    BEFORE INSERT OR UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.playlists_search_vector_update();

    UPDATE public.playlists AS p
    SET search_vector = to_tsvector(
      'simple',
      concat_ws(
        ' ',
        COALESCE(to_jsonb(p) ->> 'title', to_jsonb(p) ->> 'name', ''),
        COALESCE(to_jsonb(p) ->> 'description', '')
      )
    );

    CREATE INDEX IF NOT EXISTS ix_playlists_search_vector_gin
      ON public.playlists
      USING gin (search_vector);
  END IF;
END
$$;
