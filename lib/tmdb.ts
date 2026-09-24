import type { PlatformType } from './types';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_API_BASE = 'https://api.themoviedb.org/3';
export const WATCH_REGION = 'US';

// Platform homepage URLs for "watch on" buttons.
export const PLATFORM_URLS: Record<string, string> = {
  netflix: 'https://www.netflix.com',
  disney: 'https://www.disneyplus.com',
  hbo: 'https://www.hbomax.com',
  prime: 'https://www.primevideo.com',
  youtube: 'https://www.youtube.com',
  wetv: 'https://wetv.vip',
  viu: 'https://www.viu.com',
  iqiyi: 'https://www.iq.com',
  youku: 'https://www.youku.com',
  spotify: 'https://open.spotify.com',
  apple_music: 'https://music.apple.com',
  other: '#',
};

export type TmdbMediaType = 'movie' | 'tv' | 'documentary' | 'music';

// TMDb watch/providers IDs (US region) mapped to our PlatformType.
// Providers with no equivalent in PlatformType are intentionally left unmapped.
const PROVIDER_ID_TO_PLATFORM: Record<number, PlatformType> = {
  8: 'netflix',
  337: 'disney',
  384: 'hbo',
  9: 'prime',
  192: 'youtube',
  247: 'wetv',      // WeTV
  248: 'viu',       // Viu
  249: 'iqiyi',     // iQIYI
  250: 'youku',     // Youku
};

export function mapProviderIdsToPlatforms(providerIds: number[]): PlatformType[] {
  const platforms = new Set<PlatformType>();
  for (const id of providerIds) {
    const platform = PROVIDER_ID_TO_PLATFORM[id];
    if (platform) platforms.add(platform);
  }
  return Array.from(platforms);
}

export interface TmdbResult {
  id: number | string;
  title: string;
  artist?: string;
  year: number | null;
  poster: string | null;
  rating: number;
  type: TmdbMediaType;
  providers: PlatformType[];
}

export interface TmdbSearchResponse {
  results: TmdbResult[];
  total_pages: number;
  page: number;
}

export type TmdbCategory = 'popular' | 'top_rated';

export interface TmdbPopularResponse {
  results: TmdbResult[];
  total_pages: number;
  page: number;
}

interface TmdbListItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
}

export async function fetchPopularTmdb(
  type: TmdbMediaType,
  category: TmdbCategory,
  page: number,
  apiKey: string
): Promise<TmdbPopularResponse> {
  // Documentary (genre 99) is movie-type on TMDb — music uses MusicBrainz instead
  const isGenreFiltered = type === 'documentary';
  const endpointType = isGenreFiltered ? 'movie' : type;
  const genreParam = type === 'documentary' ? '&with_genres=99' : '';
  const url = `${TMDB_API_BASE}/${endpointType}/${category}?api_key=${apiKey}&page=${page}&language=en-US${genreParam}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TMDb request failed with status ${res.status}`);
  }

  const data: { results?: TmdbListItem[]; total_pages?: number; page?: number } = await res.json();
  const rawResults = data.results || [];

  // Fetch watch providers for each item (US region)
  const results: TmdbResult[] = await Promise.all(
    rawResults.map(async (item) => {
      const isMovieLike = type === 'movie' || type === 'documentary';
      const title = (isMovieLike ? item.title : item.name) || 'Untitled';
      const dateStr = isMovieLike ? item.release_date : item.first_air_date;
      const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;

      let providers: PlatformType[] = [];
      try {
        const provRes = await fetch(
          `${TMDB_API_BASE}/${endpointType}/${item.id}/watch/providers?api_key=${apiKey}`
        );
        if (provRes.ok) {
          const provData = await provRes.json();
          const usProviders = provData.results?.[WATCH_REGION]?.flatrate || [];
          providers = mapProviderIdsToPlatforms(usProviders.map((p: { provider_id: number }) => p.provider_id));
        }
      } catch {
        // Ignore provider fetch errors — show card without provider badges
      }

      return {
        id: item.id,
        title,
        year,
        poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
        rating: Math.round((item.vote_average || 0) * 10) / 10,
        type,
        providers,
      };
    })
  );

  return {
    results,
    total_pages: data.total_pages || 0,
    page: data.page || page,
  };
}
