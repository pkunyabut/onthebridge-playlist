export type MediaType = 'movie' | 'series' | 'documentary' | 'talkshow' | 'music' | 'news';
export type PlatformType = 'netflix' | 'disney' | 'hbo' | 'prime' | 'youtube' | 'spotify' | 'apple_music' | 'other';

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
  series: 'ซีส์',
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
  other: 'อื่นๆ',
};
