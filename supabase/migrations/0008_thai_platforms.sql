-- 0008: allow Thai channel apps / Asian platforms that JustWatch doesn't cover as the
-- "where I watch it" platform of a saved item. Safe to run more than once.
-- Existing values are kept; new: ch3plus, ch7, oned, gmm25, workpoint, vipa, amarin,
-- monomax, ais_play, trueid.

ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_platform_check;
ALTER TABLE media_items ADD CONSTRAINT media_items_platform_check
  CHECK (platform IN (
    'netflix', 'disney', 'hbo', 'prime', 'youtube', 'spotify', 'apple_music',
    'wetv', 'viu', 'iqiyi', 'youku', 'other',
    'ch3plus', 'ch7', 'oned', 'gmm25', 'workpoint', 'vipa', 'amarin',
    'monomax', 'ais_play', 'trueid'
  ));

NOTIFY pgrst, 'reload schema';
