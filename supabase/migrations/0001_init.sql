-- OnTheBridge Playlist — Supabase Schema
-- Phase 1: MVP

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media items
CREATE TABLE media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'series', 'documentary', 'talkshow', 'music', 'news')),
  platform TEXT NOT NULL CHECK (platform IN ('netflix', 'disney', 'hbo', 'prime', 'youtube', 'spotify', 'apple_music', 'other')),
  genre TEXT,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist items
CREATE TABLE playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  UNIQUE (playlist_id, media_item_id)
);

-- Indexes
CREATE INDEX idx_media_items_user ON media_items(user_id);
CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_items_platform ON media_items(platform);
CREATE INDEX idx_playlist_items_playlist ON playlist_items(playlist_id);
