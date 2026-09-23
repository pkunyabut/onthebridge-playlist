-- OnTheBridge Playlist — Row Level Security
-- Users can only access their own data

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- media_items
-- ============================================================
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media items"
  ON media_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own media items"
  ON media_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own media items"
  ON media_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own media items"
  ON media_items FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- playlists
-- ============================================================
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- playlist_items (access via parent playlist ownership)
-- ============================================================
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in own playlists"
  ON playlist_items FOR SELECT
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items into own playlists"
  ON playlist_items FOR INSERT
  WITH CHECK (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in own playlists"
  ON playlist_items FOR UPDATE
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from own playlists"
  ON playlist_items FOR DELETE
  USING (
    playlist_id IN (
      SELECT id FROM playlists WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage policy for profile avatars (bucket: 'avatars')
-- ============================================================
-- Allow users to upload, view, update, and delete their own avatar file
-- File path pattern:avatars/{user_id}/avatar.{ext}

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own avatar"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
