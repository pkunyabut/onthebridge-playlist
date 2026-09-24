import type { PlatformType } from './types';

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_API_BASE = 'https://api.themoviedb.org/3';

// Watch regions — TH is default, also show US/KR/CN/JP providers.
export const WATCH_REGIONS: WatchRegion[] = ['TH', 'US', 'KR', 'CN', 'JP'];
export type WatchRegion = 'TH' | 'US' | 'KR' | 'CN' | 'JP';
export const DEFAULT_WATCH_REGION: WatchRegion = 'TH';

// Language parameter for TMDb requests (th-TH, ko-KR, zh-CN, ja-JP, en-US).
export const DEFAULT_LANGUAGE = 'th-TH';

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

// Country-of-origin filter options
export interface CountryOption {
  code: string;
  label: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'TH', label: 'ไทย', flag: '🇹🇭' },
  { code: 'KR', label: 'เกาหลี', flag: '🇰🇷' },
  { code: 'CN', label: 'จีน', flag: '🇨🇳' },
  { code: 'JP', label: 'ญี่ปุ่น', flag: '🇯🇵' },
  { code: 'US', label: 'อเมริกา', flag: '🇺🇸' },
];

export const DEFAULT_COUNTRY = 'ALL';

export function getCountryLabel(code: string): string {
  const opt = COUNTRY_OPTIONS.find((c) => c.code === code);
  return opt ? opt.label : code;
}

export function getCountryFlag(code: string): string {
  const opt = COUNTRY_OPTIONS.find((c) => c.code === code);
  return opt ? opt.flag : '🌐';
}

// TMDb watch/providers IDs mapped to our PlatformType.
const PROVIDER_ID_TO_PLATFORM: Record<number, PlatformType> = {
  8: 'netflix',
  337: 'disney',
  384: 'hbo',
  9: 'prime',
  192: 'youtube',
  247: 'wetv',
  248: 'viu',
  249: 'iqiyi',
  250: 'youku',
};

export function mapProviderIdsToPlatforms(providerIds: number[]): PlatformType[] {
  const platforms = new Set<PlatformType>();
  for (const id of providerIds) {
    const platform = PROVIDER_ID_TO_PLATFORM[id];
    if (platform) platforms.add(platform);
  }
  return Array.from(platforms);
}

interface TmdbWatchProviderData {
  provider_id: number;
}

interface TmdbWatchProvidersResult {
  flatrate?: TmdbWatchProviderData[];
  ads?: TmdbWatchProviderData[];
  free?: TmdbWatchProviderData[];
}

interface TmdbWatchProvidersResponse {
  results?: Record<string, TmdbWatchProvidersResult>;
}

/**
 * Collect providers from all watch regions.
 * Returns combined providers (TH first) and whether TH providers exist.
 */
export function collectProvidersFromRegions(
  provData: TmdbWatchProvidersResponse,
  regions: WatchRegion[] = [...WATCH_REGIONS]
): { providers: PlatformType[]; has_th_providers: boolean } {
  const allPlatforms = new Set<PlatformType>();
  const thPlatforms = new Set<PlatformType>();

  for (const region of regions) {
    const regional = provData.results?.[region];
    if (!regional) continue;

    const providerIds = [
      ...(regional.flatrate ?? []),
      ...(regional.ads ?? []),
      ...(regional.free ?? []),
    ].map((p) => p.provider_id);

    const platforms = mapProviderIdsToPlatforms(providerIds);

    if (region === 'TH') {
      platforms.forEach((p) => thPlatforms.add(p));
    }
    platforms.forEach((p) => allPlatforms.add(p));
  }

  return {
    providers: Array.from(allPlatforms),
    has_th_providers: thPlatforms.size > 0,
  };
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
  has_th_providers: boolean;
  origin_country: string | null;
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
  origin_country?: string[];
  production_countries?: { iso_3166_1: string; name: string }[];
}

export async function fetchPopularTmdb(
  type: TmdbMediaType,
  category: TmdbCategory,
  page: number,
  apiKey: string,
  language: string = DEFAULT_LANGUAGE,
  watchRegion: WatchRegion = DEFAULT_WATCH_REGION,
  country: string = DEFAULT_COUNTRY,
): Promise<TmdbPopularResponse> {
  const isGenreFiltered = type === 'documentary' || type === 'music';
  const endpointType = type === 'documentary' || type === 'music' ? 'movie' : type;
  const genreParam = type === 'documentary' ? '99' : type === 'music' ? '10402' : '';

  let url: string;
  const isTvOrSeries = type === 'tv';
  const isMovieLike = type === 'movie' || type === 'documentary' || type === 'music';

  if (isGenreFiltered) {
    const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    let baseUrl = `${TMDB_API_BASE}/discover/${endpointType}?api_key=${apiKey}&with_genres=${genreParam}&sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
    if (country !== DEFAULT_COUNTRY) {
      if (isTvOrSeries) {
        baseUrl += `&with_origin_country=${country}`;
      } else {
        baseUrl += `&region=${country}`;
      }
    }
    url = baseUrl;
  } else if (isTvOrSeries) {
    // TV shows: use discover endpoint to support with_origin_country
    const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    let baseUrl = `${TMDB_API_BASE}/discover/tv?api_key=${apiKey}&sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
    if (country !== DEFAULT_COUNTRY) {
      baseUrl += `&with_origin_country=${country}`;
    }
    url = baseUrl;
  } else {
    // Movies: use discover endpoint to support region filter
    const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
    let baseUrl = `${TMDB_API_BASE}/discover/movie?api_key=${apiKey}&sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
    if (country !== DEFAULT_COUNTRY) {
      baseUrl += `&region=${country}`;
    }
    url = baseUrl;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDb request failed with status ${res.status}`);
  }

  const data: { results?: TmdbListItem[]; total_pages?: number; page?: number } = await res.json();
  const rawResults = data.results || [];

  // Fetch watch providers for each item (all regions)
  const results: TmdbResult[] = await Promise.all(
    rawResults.map(async (item) => {
      const title = (isMovieLike ? item.title : item.name) || 'Untitled';
      const dateStr = isMovieLike ? item.release_date : item.first_air_date;
      const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;

      // Determine origin_country from API response
      let originCountry: string | null = null;
      if (isTvOrSeries && item.origin_country && item.origin_country.length > 0) {
        originCountry = item.origin_country[0];
      } else if (isMovieLike && item.production_countries && item.production_countries.length > 0) {
        originCountry = item.production_countries[0].iso_3166_1;
      } else if (isMovieLike && country !== DEFAULT_COUNTRY) {
        // If filtered by region, use that as origin hint
        originCountry = country;
      }

      let providers: PlatformType[] = [];
      let has_th_providers = false;
      try {
        const provRes = await fetch(
          `${TMDB_API_BASE}/${endpointType}/${item.id}/watch/providers?api_key=${apiKey}`
        );
        if (provRes.ok) {
          const provData: TmdbWatchProvidersResponse = await provRes.json();
          const collected = collectProvidersFromRegions(provData);
          providers = collected.providers;
          has_th_providers = collected.has_th_providers;
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
        has_th_providers,
        origin_country: originCountry,
      };
    })
  );

  return {
    results,
    total_pages: data.total_pages || 0,
    page: data.page || page,
  };
}