-- OnTheBridge Playlist — re-assert the media_items CHECK constraints
--
-- 0001 created media_items with a platform list that omitted wetv / viu / iqiyi /
-- youku (the four Asian streamers the browse + search grids can return), and 0004 fixed
-- it. This migration is idempotent: it drops and re-creates BOTH the platform and the
-- type constraint with the exact value lists the app sends, so it is safe to run even if
-- 0004 was already applied, and it repairs a database where either constraint is missing.
--
-- Run in Supabase → SQL Editor (project jjxkwytngfjjhhrghakk) or:
--   supabase db push

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_platform_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_platform_check
  CHECK (platform IN (
    'netflix', 'disney', 'hbo', 'prime', 'youtube', 'spotify', 'apple_music',
    'wetv', 'viu', 'iqiyi', 'youku', 'other'
  ));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_type_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_type_check
  CHECK (type IN ('movie', 'series', 'documentary', 'talkshow', 'music', 'news'));

-- Belt and braces: these grants are what PostgREST needs to even reach the constraint
-- check for a signed-in user (anon is intentionally denied, which is why an
-- unauthenticated POST returns 401 from /api/media).
GRANT INSERT, SELECT, UPDATE, DELETE ON public.media_items TO authenticated;