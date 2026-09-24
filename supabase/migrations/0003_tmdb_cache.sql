-- TMDb cache tables for movies, TV shows, documentaries, and music
-- These tables store TMDb data locally to reduce API calls and improve query speed

CREATE TABLE IF NOT EXISTS tmdb_movies (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT,
  rating NUMERIC(3,1) DEFAULT 0,
  year INTEGER,
  genre TEXT,
  overview TEXT,
  cast TEXT,
  director TEXT,
  runtime INTEGER,
  category TEXT DEFAULT 'popular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tmdb_tv (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT,
  rating NUMERIC(3,1) DEFAULT 0,
  year INTEGER,
  genre TEXT,
  overview TEXT,
  cast TEXT,
  director TEXT,
  runtime INTEGER,
  category TEXT DEFAULT 'popular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tmdb_documentaries (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT,
  rating NUMERIC(3,1) DEFAULT 0,
  year INTEGER,
  genre TEXT,
  overview TEXT,
  cast TEXT,
  director TEXT,
  runtime INTEGER,
  category TEXT DEFAULT 'popular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tmdb_music (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT,
  rating NUMERIC(3,1) DEFAULT 0,
  year INTEGER,
  genre TEXT,
  overview TEXT,
  cast TEXT,
  director TEXT,
  runtime INTEGER,
  category TEXT DEFAULT 'popular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_tmdb_movies_rating ON tmdb_movies(rating DESC);
CREATE INDEX IF NOT EXISTS idx_tmdb_movies_year ON tmdb_movies(year DESC);
CREATE INDEX IF NOT EXISTS idx_tmdb_tv_rating ON tmdb_tv(rating DESC);
CREATE INDEX IF NOT EXISTS idx_tmdb_tv_year ON tmdb_tv(year DESC);
CREATE INDEX IF NOT EXISTS idx_tmdb_documentaries_rating ON tmdb_documentaries(rating DESC);
CREATE INDEX IF NOT EXISTS idx_tmdb_music_rating ON tmdb_music(rating DESC);

-- Enable RLS on all cache tables
ALTER TABLE tmdb_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmdb_tv ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmdb_documentaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tmdb_music ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (cache is public, written by service role)
CREATE POLICY "Allow anon read tmdb_movies" ON tmdb_movies FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read tmdb_tv" ON tmdb_tv FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read tmdb_documentaries" ON tmdb_documentaries FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read tmdb_music" ON tmdb_music FOR SELECT TO anon USING (true);

-- Service role can write (sync function uses service role key)
CREATE POLICY "Allow service role write tmdb_movies" ON tmdb_movies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role write tmdb_tv" ON tmdb_tv FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role write tmdb_documentaries" ON tmdb_documentaries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role write tmdb_music" ON tmdb_music FOR ALL TO service_role USING (true) WITH CHECK (true);
