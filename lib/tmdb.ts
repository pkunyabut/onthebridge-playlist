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

/**
 * Collect the raw streaming provider ids (flatrate/free/ads) that TMDb reports for an
 * item across the given regions. Kept separate from the PlatformType mapping because
 * Apple TV+ (350) and the music services have no PlatformType of their own — the
 * "available on my services" highlight needs the exact ids, not a coarse platform.
 */
export function collectStreamingProviderIds(
  provData: TmdbWatchProvidersResponse,
  regions: WatchRegion[] = [...WATCH_REGIONS]
): number[] {
  const ids = new Set<number>();
  for (const region of regions) {
    const regional = provData.results?.[region];
    if (!regional) continue;
    for (const tier of [regional.flatrate, regional.free, regional.ads]) {
      for (const p of tier ?? []) ids.add(p.provider_id);
    }
  }
  return Array.from(ids);
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
  /** Raw TMDb streaming provider ids (flatrate/free/ads) — used for exact
   *  "available on my services" matching (Apple TV+ / music services have no
   *  PlatformType of their own). */
  provider_ids?: number[];
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
): Promise<{ providers: PlatformType[]; has_th_providers: boolean; provider_ids: number[] }> {
  const endpointType = type === 'documentary' || type === 'music' ? 'movie' : type;
  try {
    const data = await fetchTmdb(`/${endpointType}/${id}`, {
      append_to_response: 'watch/providers',
      language: DEFAULT_LANGUAGE,
    }, apiKey);
    const provData = (data as { 'watch/providers'?: TmdbWatchProvidersResponse })['watch/providers'];
    if (!provData) return { providers: [], has_th_providers: false, provider_ids: [] };
    const collected = collectProvidersFromRegions(provData, WATCH_REGIONS);
    return {
      providers: collected.providers,
      has_th_providers: collected.has_th_providers,
      provider_ids: collectStreamingProviderIds(provData, WATCH_REGIONS),
    };
  } catch (error) {
    // Log non-retryable errors for monitoring
    if (error instanceof TmdbApiError && error.status !== 429) {
      console.warn(`[TMDb] Provider fetch failed for ${type}/${id}: ${error.status}`);
    }
    return { providers: [], has_th_providers: false, provider_ids: [] };
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
  options: BrowseOptions = {},
): Promise<TmdbPopularResponse> {
  const mode: BrowseMode = options.mode === 'theaters' ? 'theaters' : 'streaming';
  // TMDb only publishes theatrical listings for movies (/movie/now_playing), so a TV or
  // music type can never be honestly reported as "in theaters" — those keep the
  // streaming path instead of faking a cinema flag.
  const theatersMode = mode === 'theaters' && type !== 'tv' && type !== 'music';
  const isGenreFiltered = type === 'documentary' || type === 'music';
  const endpointType = type === 'documentary' || type === 'music' ? 'movie' : type;
  const genreParam = type === 'documentary' ? '99' : type === 'music' ? '10402' : '';
  const isTvOrSeries = type === 'tv';
  const isMovieLike = type === 'movie' || type === 'documentary' || type === 'music';

  const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
  const params = new URLSearchParams({
    page: String(page),
    language,
  });

  let path: string;
  if (theatersMode) {
    // Authoritative "in Thai cinemas right now" list — TMDb maintains now_playing per
    // region, so this is never guessed from release dates. now_playing only accepts
    // region/language/page: genre and popular/top_rated refinements simply do not exist
    // there, and the UI tells the user that instead of pretending they applied.
    path = '/movie/now_playing';
    params.set('region', watchRegion);
  } else {
    path = `/discover/${endpointType}`;
    params.set('sort_by', sortBy);
    params.set('vote_count.gte', '10');
    // Only return titles that are actually watchable in the selected region, otherwise
    // the browse grid fills up with cinema-only releases that have no provider data.
    params.set('watch_region', watchRegion);
    params.set('with_watch_monetization_types', STREAMING_MONETIZATION);

    // Genre: the type tab's own genre (สารคดี / เพลง) AND the user's pick — comma is
    // TMDb's AND separator, a pipe would silently OR two unrelated genres together.
    const genreIds: string[] = [];
    if (isGenreFiltered && genreParam) genreIds.push(genreParam);
    if (options.genreId) genreIds.push(options.genreId);
    if (genreIds.length > 0) {
      params.set('with_genres', genreIds.join(','));
    }

    // "เฉพาะบริการของฉัน" — restrict to the TMDb provider ids of the user's services.
    const providerIds = (options.providerIds ?? []).filter((id) => Number.isFinite(id) && id > 0);
    if (providerIds.length > 0) {
      params.set('with_watch_providers', providerIds.join('|'));
    }

    // Country / origin filter works on discover for both movies and TV; TMDb ORs
    // pipe-separated country codes inside with_origin_country.
    const origins =
      options.originCountries && options.originCountries.length > 0
        ? options.originCountries
        : country !== DEFAULT_COUNTRY
        ? [country]
        : [];
    if (origins.length > 0) {
      params.set('with_origin_country', origins.join('|'));
    }
    if (options.originalLanguages && options.originalLanguages.length > 0) {
      params.set('with_original_language', options.originalLanguages.join('|'));
    }
  }

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
      const { providers, has_th_providers, provider_ids } = await fetchProvidersForItem(
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
        provider_ids,
      };
    })
  );

  return {
    results,
    total_pages: data.total_pages || 0,
    page: data.page || page,
  };
}

// ============================================================================
// Items 3-7: browse modes, genres, my-services, curated rows, origin rows
// ============================================================================

export type BrowseMode = 'streaming' | 'theaters';

/**
 * "ที่สตรีมมิ่ง" means the title is included in a subscription in watchRegion.
 * TMDb calls that monetization type `flatrate` (ad-supported and free tiers are
 * separate types), and it is the only type that pairs meaningfully with
 * `with_watch_providers` for "เฉพาะบริการของฉัน".
 */
export const STREAMING_MONETIZATION = 'flatrate';

export interface BrowseOptions {
  /** 'streaming' (default) = discover + watch_region; 'theaters' = /movie/now_playing?region= */
  mode?: BrowseMode;
  /** Extra TMDb genre id AND-ed onto the type tab's own genre. */
  genreId?: string | null;
  /** TMDb provider ids for the "only my services" filter. */
  providerIds?: number[];
  /** Origin countries (OR-combined with a pipe) — Thai/Asia section. */
  originCountries?: string[] | null;
  /** Original languages (OR-combined) — used only if a country filter returns nothing. */
  originalLanguages?: string[] | null;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

/**
 * Genre lists in Thai. /genre/movie/list and /genre/tv/list are the authoritative
 * source: TMDb's ids for the same genre word differ between movie and TV, so the two
 * lists must never be merged or the filter would return wrong results.
 */
export async function fetchGenres(
  apiKey: string,
  language: string = DEFAULT_LANGUAGE,
): Promise<{ movie: TmdbGenre[]; tv: TmdbGenre[] }> {
  const [movieData, tvData] = await Promise.all([
    fetchTmdb('/genre/movie/list', { language }, apiKey) as Promise<{ genres?: TmdbGenre[] }>,
    fetchTmdb('/genre/tv/list', { language }, apiKey) as Promise<{ genres?: TmdbGenre[] }>,
  ]);
  return { movie: movieData.genres ?? [], tv: tvData.genres ?? [] };
}

// ---------------------------------------------------------------------------
// Item 4: streaming services the user subscribes to
// ---------------------------------------------------------------------------

export interface ServiceOption {
  key: string;
  label: string;
  platform: PlatformType;
  /** TMDb watch-provider ids that identify this service in TH. */
  providerIds: number[];
  /** i18n key of the honest note shown when TMDb cannot back this service for film/TV in TH. */
  noteKey?: string;
  /**
   * True only when TMDb's own TH catalog (/watch/providers/movie|tv?watch_region=TH,
   * merged) actually lists one of providerIds. Services that are not backed still show
   * in the picker, but they are excluded from the "only my services" filter — sending
   * an unknown provider id would silently behave like "no filter for this service".
   */
  thBacked: boolean;
}

/**
 * The 11 services the user asked for. Verified against
 * /watch/providers/movie|tv?watch_region=TH on 2026-09-25: TMDb lists
 * Netflix 8/175, Prime Video 119/10, Apple TV+ 350, Disney+ 122, Viu 158 and HBO Max
 * 1899 for Thailand. WeTV (623/509), iQIYI (581) and YouTube Premium (188/192/235) are
 * NOT in TMDb's TH catalog, and Spotify/Apple Music have no film/TV provider entry at
 * all, so those five are selectable but cannot drive filters or highlights.
 */
export const SERVICE_OPTIONS: ServiceOption[] = [
  { key: 'netflix', label: 'Netflix', platform: 'netflix', providerIds: [8, 175, 1796], thBacked: true },
  { key: 'disney', label: 'Disney+', platform: 'disney', providerIds: [122, 337], thBacked: true },
  { key: 'hbo', label: 'HBO Max', platform: 'hbo', providerIds: [1899, 384], thBacked: true },
  { key: 'prime', label: 'Prime Video', platform: 'prime', providerIds: [119, 10, 9], thBacked: true },
  { key: 'apple_tv', label: 'Apple TV+', platform: 'other', providerIds: [350], thBacked: true },
  { key: 'viu', label: 'Viu', platform: 'viu', providerIds: [158], thBacked: true },
  {
    key: 'wetv',
    label: 'WeTV',
    platform: 'wetv',
    providerIds: [],
    thBacked: false,
    noteKey: 'service_note_no_th',
  },
  {
    key: 'iqiyi',
    label: 'iQIYI',
    platform: 'iqiyi',
    providerIds: [],
    thBacked: false,
    noteKey: 'service_note_no_th',
  },
  {
    key: 'youtube',
    label: 'YouTube Premium',
    platform: 'youtube',
    providerIds: [],
    thBacked: false,
    noteKey: 'service_note_no_th',
  },
  {
    key: 'spotify',
    label: 'Spotify',
    platform: 'spotify',
    providerIds: [],
    thBacked: false,
    noteKey: 'service_note_music',
  },
  {
    key: 'apple_music',
    label: 'Apple Music',
    platform: 'apple_music',
    providerIds: [],
    thBacked: false,
    noteKey: 'service_note_music',
  },
];

export function getService(key: string): ServiceOption | undefined {
  return SERVICE_OPTIONS.find((s) => s.key === key);
}

/** Flatten the selected service keys into TMDb provider ids (music services are skipped). */
export function serviceProviderIds(serviceKeys: string[]): number[] {
  const ids = new Set<number>();
  for (const key of serviceKeys) {
    const service = getService(key);
    if (!service) continue;
    service.providerIds.forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

/** True when an item is available on at least one of the selected services. */
export function isOnMyServices(item: TmdbResult, serviceKeys: string[]): boolean {
  if (serviceKeys.length === 0) return false;
  const wanted = new Set(serviceProviderIds(serviceKeys));
  if (wanted.size === 0) return false;
  if (item.provider_ids && item.provider_ids.length > 0) {
    return item.provider_ids.some((id) => wanted.has(id));
  }
  // Fall back to the coarse platform match when raw ids are unavailable.
  const platforms = new Set(serviceKeys.map((k) => getService(k)?.platform).filter(Boolean));
  return item.providers.some((p) => platforms.has(p));
}

// ---------------------------------------------------------------------------
// Items 6 & 7: curated rows and origin (Thai/Asia) rows
// ---------------------------------------------------------------------------

export interface TmdbRowItem {
  id: number;
  title: string;
  year: number | null;
  poster: string | null;
  rating: number;
  type: TmdbMediaType;
}

export type RowKind = 'trending' | 'top_rated' | 'for_you' | 'origin';

interface TmdbRowRaw {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  media_type?: string;
  popularity?: number;
}

function toRowItem(item: TmdbRowRaw, fallbackType: TmdbMediaType): TmdbRowItem {
  const isTv = fallbackType === 'tv' || item.media_type === 'tv';
  const dateStr = isTv ? item.first_air_date : item.release_date;
  return {
    id: item.id,
    title: (isTv ? item.name : item.title) || item.title || item.name || 'ไม่ทราบชื่อ',
    year: dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null,
    poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
    rating: Math.round((item.vote_average || 0) * 10) / 10,
    type: isTv ? 'tv' : fallbackType,
  };
}

/** กำลังมาแรง — /trending/movie/week (TMDb's own weekly trending list). */
export async function fetchTrendingRow(
  apiKey: string,
  language: string = DEFAULT_LANGUAGE,
): Promise<TmdbRowItem[]> {
  const data = await fetchTmdb('/trending/movie/week', { language }, apiKey) as { results?: TmdbRowRaw[] };
  return (data.results ?? []).map((item) => toRowItem(item, 'movie'));
}

/**
 * คะแนนสูงสุด — highest-rated movies that at least TOP_RATED_MIN_VOTES people rated,
 * so brand-new titles with a handful of votes (e.g. a 9.2 from 20 votes) stay out.
 * No `region` param: with region=TH TMDb swaps in Thai re-release dates
 * (The Godfather showed as 2022).
 */
const TOP_RATED_MIN_VOTES = '1000';

export async function fetchTopRatedRow(
  apiKey: string,
  language: string = DEFAULT_LANGUAGE,
): Promise<TmdbRowItem[]> {
  const data = await fetchTmdb('/discover/movie', {
    language,
    sort_by: 'vote_average.desc',
    'vote_count.gte': TOP_RATED_MIN_VOTES,
    include_adult: 'false',
    page: '1',
  }, apiKey) as { results?: TmdbRowRaw[] };
  return (data.results ?? []).map((item) => toRowItem(item, 'movie'));
}

/**
 * แนะนำสำหรับคุณ — the watchlist stores titles (no TMDb id column), so each saved
 * title is resolved through /search/multi first, then /{movie|tv}/{id}/recommendations
 * is used. Only real TMDb recommendation results are returned.
 */
export async function fetchRecommendationsForTitles(
  apiKey: string,
  titles: string[],
  language: string = DEFAULT_LANGUAGE,
  limit: number = 18,
): Promise<TmdbRowItem[]> {
  const seeds: { id: number; type: 'movie' | 'tv' }[] = [];

  for (const title of titles.slice(0, 3)) {
    const query = title.trim();
    if (!query) continue;
    try {
      const search = await fetchTmdb('/search/multi', {
        query,
        language,
        include_adult: 'false',
        page: '1',
      }, apiKey) as { results?: (TmdbRowRaw & { media_type?: string })[] };
      const match = (search.results ?? []).find(
        (r) => r.media_type === 'movie' || r.media_type === 'tv'
      );
      if (match) {
        seeds.push({ id: match.id, type: match.media_type === 'tv' ? 'tv' : 'movie' });
      }
    } catch {
      // A single unresolvable title must not break the whole row.
    }
  }

  const merged = new Map<string, { item: TmdbRowItem; popularity: number }>();
  for (const seed of seeds) {
    try {
      const data = await fetchTmdb(`/${seed.type}/${seed.id}/recommendations`, {
        language,
        page: '1',
      }, apiKey) as { results?: TmdbRowRaw[] };
      for (const raw of data.results ?? []) {
        const item = toRowItem(raw, seed.type);
        const key = `${item.type}-${item.id}`;
        if (item.id === seed.id) continue;
        const existing = merged.get(key);
        if (!existing || (raw.popularity ?? 0) > existing.popularity) {
          merged.set(key, { item, popularity: raw.popularity ?? 0 });
        }
      }
    } catch {
      // Ignore an individual seed failure and keep whatever the other seeds returned.
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * Item 7 — Thai / Asian titles from /discover with with_origin_country (pipe = OR),
 * sort_by=popularity.desc, language=th-TH. TMDb has no watch_region requirement for
 * this filter, so a title does not need a Thai streaming listing to be surfaced.
 */
export async function fetchOriginRow(
  apiKey: string,
  countries: string[],
  language: string = DEFAULT_LANGUAGE,
  mediaType: 'movie' | 'tv' = 'movie',
  limit: number = 18,
): Promise<TmdbRowItem[]> {
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    with_origin_country: countries.join('|'),
    language,
    page: '1',
    'vote_count.gte': '5',
    include_adult: 'false',
  };
  const data = await fetchTmdb(`/discover/${mediaType}`, params, apiKey) as { results?: TmdbRowRaw[] };
  return (data.results ?? []).slice(0, limit).map((item) => toRowItem(item, mediaType));
}

/**
 * Series by the channel/platform they aired on (TMDB networks, pipe = OR) — covers Thai
 * channels and Asian platforms that JustWatch has no data for. Popular first; shows that
 * have not started airing yet are left out.
 */
export async function fetchNetworkRow(
  apiKey: string,
  networkIds: number[],
  language: string = DEFAULT_LANGUAGE,
  limit: number = 20,
): Promise<TmdbRowItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const data = await fetchTmdb('/discover/tv', {
    with_networks: networkIds.join('|'),
    sort_by: 'popularity.desc',
    'first_air_date.lte': today,
    language,
    page: '1',
    include_adult: 'false',
  }, apiKey) as { results?: TmdbRowRaw[] };
  return (data.results ?? []).slice(0, limit).map((item) => toRowItem(item, 'tv'));
}

export interface OriginRegionOption {
  key: string;
  label: string;
  flag: string;
  countries: string[];
  languages: string[];
}

/** Item 7 region chips — country codes verified against /discover before wiring. */
export const ORIGIN_REGIONS: OriginRegionOption[] = [
  { key: 'TH', label: 'ไทย', flag: '🇹🇭', countries: ['TH'], languages: ['th'] },
  { key: 'KR', label: 'เกาหลี', flag: '🇰🇷', countries: ['KR'], languages: ['ko'] },
  { key: 'JP', label: 'ญี่ปุ่น', flag: '🇯🇵', countries: ['JP'], languages: ['ja'] },
  { key: 'CN', label: 'จีน', flag: '🇨🇳', countries: ['CN'], languages: ['zh'] },
  { key: 'HK', label: 'ฮ่องกง', flag: '🇭🇰', countries: ['HK'], languages: ['zh'] },
  { key: 'TW', label: 'ไต้หวัน', flag: '🇹🇼', countries: ['TW'], languages: ['zh'] },
  { key: 'IN', label: 'อินเดีย', flag: '🇮🇳', countries: ['IN'], languages: ['hi'] },
  { key: 'ASIA', label: 'เอเชียทั้งหมด', flag: '🌏', countries: ['TH', 'KR', 'JP', 'CN', 'HK', 'TW', 'IN'], languages: ['th', 'ko', 'ja', 'zh', 'hi'] },
];

export function getOriginRegion(key: string): OriginRegionOption | undefined {
  return ORIGIN_REGIONS.find((r) => r.key === key);
}
