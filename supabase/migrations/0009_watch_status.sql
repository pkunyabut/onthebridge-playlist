-- 0009: watch status + episode progress for saved items ("ดูแล้ว / กำลังดูถึงตอนที่…").
-- Personal notes already use the existing `notes` column. Safe to run more than once.

ALTER TABLE media_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'want';
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS progress_season INTEGER;   -- series: season of the last watched episode
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS progress_episode INTEGER;  -- series: last watched episode

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_status_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_status_check
  CHECK (status IN ('want', 'watching', 'watched'));

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_progress_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_progress_check
  CHECK ((progress_season IS NULL OR progress_season >= 1)
     AND (progress_episode IS NULL OR progress_episode >= 0));

NOTIFY pgrst, 'reload schema';

-- Check (run separately, read-only):
-- SELECT column_name, column_default FROM information_schema.columns
-- WHERE table_name = 'media_items' AND column_name IN ('status', 'progress_season', 'progress_episode');
