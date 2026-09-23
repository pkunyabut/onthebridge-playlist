# Claude Code Instructions

## Project Overview
OnTheBridge Playlist — a free, cross-platform media playlist organizer.
Users add movies, series, documentaries, talk shows, and songs from any platform
(Netflix, Disney+, HBO, Prime, YouTube, Spotify, Apple Music, etc.) and organize
them by category. AI recommends new items. No content playback — only metadata
(title + category + platform). Users watch on their own subscribed platforms.

## Tech Stack
- Framework: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Database: Supabase (PostgreSQL) + Supabase Auth (Google/Email login)
- Hosting: Vercel (planned)
- AI: DeepSeek API (free tier, Thai language support)

## Architecture

### Database (Supabase Tables)
- `profiles` — user profiles (id, username, created_at)
- `media_items` — stored media (id, user_id, title, type, platform, genre, year, notes, created_at)
  - type: 'movie' | 'series' | 'documentary' | 'talkshow' | 'music'
  - platform: 'netflix' | 'disney' | 'hbo' | 'prime' | 'youtube' | 'spotify' | 'apple_music' | 'other'
- `playlists` — user playlists (id, user_id, name, description, created_at)
- `playlist_items` — items in playlists (id, playlist_id, media_item_id, position)

### App Routes
- `/` — landing page (marketing)
- `/dashboard` — main app (requires auth)
- `/dashboard/add` — add new media item
- `/dashboard/category/[type]` — filter by category
- `/dashboard/playlist/[id]` — view playlist
- `/api/ai/recommend` — AI recommendation endpoint
- `/api/media` — CRUD for media items
- `/api/playlists` — CRUD for playlists

### AI Features (Phase 2)
- DeepSeek API analyzes user's saved items and recommends similar titles
- Uses metadata from TMDB (movies/series) and MusicBrainz (music)
- Suggests items in same genre/category from different platforms

## Files
- `/app` — Next.js pages
- `/components` — React components
- `/lib` — Supabase client, utilities
- `/supabase` — migrations, schema

## Important Rules
- NEVER modify articles, images, or audio files in this project
- Test on mobile viewport (360/390/430px)
- Support Thai language UI
- All features must work without payment (free tier only)
- No user data collection beyond what's needed for auth

## Workflow
1. Build MVP first: auth + add item + view list + filter
2. Test thoroughly
3. Add AI recommendations (Phase 2)
4. Polish UI/UX
