-- 0010: row-level security policies for collections (tables playlists / playlist_items).
-- Checked 2026-09-26: RLS was enabled on both tables but pg_policies had NO rows for them
-- (the policies in 0002 never reached the database), so every insert was refused.
-- Safe to run more than once: each policy is dropped (if it exists) and created again.

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;

-- playlists: each user sees and changes only their own collections
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own playlists" ON playlists;
CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE USING (user_id = auth.uid());

-- playlist_items: only inside the user's own collections
DROP POLICY IF EXISTS "Users can view items in own playlists" ON playlist_items;
CREATE POLICY "Users can view items in own playlists"
  ON playlist_items FOR SELECT
  USING (playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert items into own playlists" ON playlist_items;
CREATE POLICY "Users can insert items into own playlists"
  ON playlist_items FOR INSERT
  WITH CHECK (playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update items in own playlists" ON playlist_items;
CREATE POLICY "Users can update items in own playlists"
  ON playlist_items FOR UPDATE
  USING (playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid()))
  WITH CHECK (playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete items from own playlists" ON playlist_items;
CREATE POLICY "Users can delete items from own playlists"
  ON playlist_items FOR DELETE
  USING (playlist_id IN (SELECT id FROM playlists WHERE user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';

-- Check (run separately, read-only) — expect 8 rows:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('playlists', 'playlist_items') ORDER BY tablename, cmd;
