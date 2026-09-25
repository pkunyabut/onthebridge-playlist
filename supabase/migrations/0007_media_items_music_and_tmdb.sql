-- 0007: extra columns on media_items for real music (iTunes) and exact TMDb matches.
-- Safe to run more than once (IF NOT EXISTS / DROP ... IF EXISTS). Existing rows are untouched;
-- every new column is optional (NULL for old items).

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS artist TEXT;           -- songs: artist name
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS album TEXT;            -- songs: album name
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS cover_url TEXT;        -- album cover / movie poster
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS itunes_track_id BIGINT; -- songs: iTunes track id (30s preview is looked up by this)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS external_url TEXT;     -- songs: Apple Music link
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;       -- movies/series: exact TMDb id
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS tmdb_media TEXT;       -- 'movie' or 'tv'

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_tmdb_media_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_tmdb_media_check
  CHECK (tmdb_media IS NULL OR tmdb_media IN ('movie', 'tv'));

-- Make the Supabase API see the new columns right away.
NOTIFY pgrst, 'reload schema';
