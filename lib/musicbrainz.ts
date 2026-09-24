import type { PlatformType } from './types';

export interface MusicBrainzResult {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  poster: string | null;
  rating: number;
  type: 'music';
  providers: PlatformType[];
}

export interface MusicBrainzResponse {
  results: MusicBrainzResult[];
  total_pages: number;
  page: number;
}

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'OnTheBridgePlaylist/1.0 (https://onthebridge-playlist.vercel.app)';

export async function fetchPopularMusic(page: number, limit: number = 20): Promise<MusicBrainzResponse> {
  const offset = (page - 1) * limit;

  const url = `${MUSICBRAINZ_API_BASE}/recording/?query=*&fmt=json&limit=${limit}&offset=${offset}&inc=artists`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz request failed with status ${res.status}`);
  }

  const data = await res.json();
  const recordings = data.recordings || [];

  const results: MusicBrainzResult[] = recordings.map((rec: any) => {
    const artist = rec['artist-credit']?.[0]?.name || 'Unknown Artist';
    const year = rec['first-release-date'] ? parseInt(rec['first-release-date'].slice(0, 4), 10) : null;

    return {
      id: rec.id,
      title: rec.title,
      artist,
      year,
      poster: null,
      rating: 0,
      type: 'music' as const,
      providers: [],
    };
  });

  return {
    results,
    total_pages: Math.ceil((data.count || 0) / limit),
    page,
  };
}
