export type MediaType = 'movie' | 'series' | 'documentary' | 'talkshow' | 'music' | 'news';
export type PlatformType = 'netflix' | 'disney' | 'hbo' | 'prime' | 'youtube' | 'spotify' | 'apple_music' | 'wetv' | 'viu' | 'iqiyi' | 'youku' | 'other';

// Must stay in sync with the CHECK constraints in supabase/migrations/0001_init.sql
// and 0005_media_items_check_constraints.sql.
export const MEDIA_TYPES: MediaType[] = ['movie', 'series', 'documentary', 'talkshow', 'music', 'news'];
export const PLATFORM_TYPES: PlatformType[] = ['netflix', 'disney', 'hbo', 'prime', 'youtube', 'spotify', 'apple_music', 'wetv', 'viu', 'iqiyi', 'youku', 'other'];

export function isValidMediaType(value: unknown): value is MediaType {
  return typeof value === 'string' && (MEDIA_TYPES as string[]).includes(value);
}

export function isValidPlatform(value: unknown): value is PlatformType {
  return typeof value === 'string' && (PLATFORM_TYPES as string[]).includes(value);
}

/**
 * Map a TMDb media type to the media_items.type value.
 * The browse/search endpoints use 'tv' for series, but media_items.type only accepts
 * 'series' — sending 'tv' makes the INSERT fail the CHECK constraint.
 */
export function toMediaType(tmdbType: string): MediaType {
  if (tmdbType === 'tv' || tmdbType === 'series') return 'series';
  if (tmdbType === 'documentary' || tmdbType === 'music' || tmdbType === 'movie' || tmdbType === 'talkshow' || tmdbType === 'news') {
    return tmdbType;
  }
  return 'other' as MediaType;
}

export interface Profile {
  id: string;
  username: string | null;
  created_at: string;
}

export interface MediaItem {
  id: string;
  user_id: string;
  title: string;
  type: MediaType;
  platform: PlatformType;
  genre: string | null;
  year: number | null;
  notes: string | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_item_id: string;
  position: number;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'ภาพยนตร์',
  series: 'ซีรีส์',
  documentary: 'สารคดี',
  talkshow: 'ทอล์คโชว์',
  music: 'เพลง',
  news: 'ข่าว',
};

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  netflix: 'Netflix',
  disney: 'Disney+',
  hbo: 'HBO Max',
  prime: 'Prime Video',
  youtube: 'YouTube',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  wetv: 'WeTV',
  viu: 'VIU',
  iqiyi: 'iQIYI',
  youku: 'Youku',
  other: 'อื่นๆ',
};

export const PLATFORM_ICONS: Record<PlatformType, string> = {
  netflix: '🔴',
  disney: '✨',
  hbo: '🟣',
  prime: '📦',
  youtube: '▶️',
  spotify: '🎧',
  apple_music: '🍎',
  wetv: '🟢',
  viu: '🔵',
  iqiyi: '🟡',
  youku: '🟠',
  other: '📌',
};
