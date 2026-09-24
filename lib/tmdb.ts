import type { PlatformType } from './types';
import { fetchTmdb, TmdbApiError } from './tmdb-client';

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
// IDs verified against https://api.themoviedb.org/3/watch/providers/{movie,tv} — the
// same service is listed under several IDs per region (e.g. Disney+ is 122 in TH/SEA
// and 337 in US/KR/JP, Prime Video is 9 / 119 / 10), so every alias must be mapped or
// Thai items silently lose their provider badges.
const PROVIDER_ID_TO_PLATFORM: Record<number, PlatformType> = {
  // Netflix (8 = Netflix, 175 = Netflix Kids, 1796 = Netflix Standard with Ads)
  8: 'netflix',
  175: 'netflix',
  1796: 'netflix',
  // Disney+ (122 = Disney+ TH/SEA/EU, 337 = Disney Plus US/KR/JP, 508 = DisneyNOW)
  122: 'disney',
  337: 'disney',
  508: 'disney',
  // HBO Max (1899 = HBO Max, 384 = legacy id, 1825 = Amazon Channel, 2284 = on U-Next)
  1899: 'hbo',
  384: 'hbo',
  1825: 'hbo',
  2284: 'hbo',
  // Prime Video (9 / 119 = Amazon Prime Video, 10 = Amazon Video, 613 / 2100 = ad tiers)
  9: 'prime',
  119: 'prime',
  10: 'prime',
  613: 'prime',
  2100: 'prime',
  // YouTube (192 = YouTube, 188 = Premium, 235 = Free, 2528 = YouTube TV)
  192: 'youtube',
  188: 'youtube',
  235: 'youtube',
  2528: 'youtube',
  // WeTV (623 = movie catalog, 509 = TV catalog) — the old 247 id was wrong
  623: 'wetv',
  509: 'wetv',
  // Viu — the old 248 id was wrong
  158: 'viu',
  // iQIYI — the old 249 id was wrong
  581: 'iqiyi',
  // Youku has no TMDb provider id yet; kept so manually entered items still map.
  250: 'youku',
  // Storefronts / rent-and-buy only: Apple TV Store, Google Play Movies, Fandango at Home
  2: 'other',
  3: 'other',
  7: 'other',
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
  buy?: TmdbWatchProviderData[];
  rent?: TmdbWatchProviderData[];
}

interface TmdbWatchProvidersResponse {
  results?: Record<string, TmdbWatchProvidersResult>;
}

/**
 * Collect providers from all watch regions.
 * Streaming tiers (flatrate/free/ads) win; rent/buy-only titles fall back to the
 * storefronts so an item is never shown without any provider badge.
 * Returns combined providers (TH first) and whether TH providers exist.
 */
export function collectProvidersFromRegions(
  provData: TmdbWatchProvidersResponse,
  regions: WatchRegion[] = [...WATCH_REGIONS]
): { providers: PlatformType[]; has_th_providers: boolean } {
  const streaming = new Set<PlatformType>();
  const purchase = new Set<PlatformType>();
  const thStreaming = new Set<PlatformType>();
  const thPurchase = new Set<PlatformType>();

  for (const region of regions) {
    const regional = provData.results?.[region];
    if (!regional) continue;

    const tierIds = (tier?: TmdbWatchProviderData[]) => (tier ?? []).map((p) => p.provider_id);

    const streamPlatforms = mapProviderIdsToPlatforms([
      ...tierIds(regional.flatrate),
      ...tierIds(regional.free),
      ...tierIds(regional.ads),
    ]);
    const purchasePlatforms = mapProviderIdsToPlatforms([
      ...tierIds(regional.buy),
      ...tierIds(regional.rent),
    ]);

    streamPlatforms.forEach((p) => streaming.add(p));
    purchasePlatforms.forEach((p) => purchase.add(p));

    if (region === 'TH') {
      streamPlatforms.forEach((p) => thStreaming.add(p));
      purchasePlatforms.forEach((p) => thPurchase.add(p));
    }
  }

  // Prefer subscription/free availability; only fall back to rent/buy when nothing is
  // included in a subscription anywhere we look.
  const providers = streaming.size > 0 ? Array.from(streaming) : Array.from(purchase);

  return {
    providers,
    has_th_providers:
      thStreaming.size > 0 || (streaming.size === 0 && thPurchase.size > 0),
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
  // Optional metadata (populated from cache layer)
  overview?: string | null;
  cast?: string | null;
  director?: string | null;
  runtime?: number | null;
  genre?: string | null;
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
  // Appended from append_to_response
  'watch/providers'?: TmdbWatchProvidersResponse;
}

/**
 * Fetch watch providers for a single item using append_to_response.
 * Returns providers and whether TH providers exist.
 */
async function fetchProvidersForItem(
  type: TmdbMediaType,
  id: number,
  apiKey: string,
): Promise<{ providers: PlatformType[]; has_th_providers: boolean }> {
  const endpointType = type === 'documentary' || type === 'music' ? 'movie' : type;
  try {
    const data = await fetchTmdb(`/${endpointType}/${id}`, {
      append_to_response: 'watch/providers',
      language: DEFAULT_LANGUAGE,
    }, apiKey);
    const provData = (data as { 'watch/providers'?: TmdbWatchProvidersResponse })['watch/providers'];
    if (!provData) return { providers: [], has_th_providers: false };
    const collected = collectProvidersFromRegions(provData, WATCH_REGIONS);
    return { providers: collected.providers, has_th_providers: collected.has_th_providers };
  } catch (error) {
    // Log non-retryable errors for monitoring
    if (error instanceof TmdbApiError && error.status !== 429) {
      console.warn(`[TMDb] Provider fetch failed for ${type}/${id}: ${error.status}`);
    }
    return { providers: [], has_th_providers: false };
  }
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
  const isTvOrSeries = type === 'tv';
  const isMovieLike = type === 'movie' || type === 'documentary' || type === 'music';

  const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
  const params = new URLSearchParams({
    sort_by: sortBy,
    page: String(page),
    language,
    'vote_count.gte': '10',
    // Only return titles that are actually watchable in the selected region, otherwise
    // the browse grid fills up with cinema-only releases that have no provider data.
    watch_region: watchRegion,
    with_watch_monetization_types: 'flatrate|free|ads',
  });

  if (isGenreFiltered && genreParam) {
    params.set('with_genres', genreParam);
  }

  // Country-of-origin filter works on discover for both movies and TV.
  if (country !== DEFAULT_COUNTRY) {
    params.set('with_origin_country', country);
  }

  const path = `/discover/${endpointType}`;
  const query: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });

  const data = await fetchTmdb(path, query, apiKey) as { results?: TmdbListItem[]; total_pages?: number; page?: number };

  const rawResults = data.results || [];

  // Fetch watch providers for each item using append_to_response
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

      // Use append_to_response to fetch providers in the same call
      const { providers, has_th_providers } = await fetchProvidersForItem(
        type,
        item.id,
        apiKey,
      );

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
