-- OnTheBridge Playlist — Fix media_items platform CHECK constraint
-- Add missing platforms: wetv, viu, iqiyi, youku

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_platform_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_platform_check
  CHECK (platform IN ('netflix', 'disney', 'hbo', 'prime', 'youtube', 'spotify', 'apple_music', 'wetv', 'viu', 'iqiyi', 'youku', 'other'));
