/**
 * TMDb Cache Layer — queries Supabase cache tables first, falls back to TMDb API.
 * Converts cached rows to TmdbResult format for the existing UI.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TMDB_IMAGE_BASE } from './tmdb';
import { collectProvidersFromRegions, mapProviderIdsToPlatforms, PLATFORM_URLS } from './tmdb';
import type { PlatformType } from './types';
import type { TmdbResult, TmdbMediaType, TmdbCategory } from './tmdb';

const TABLE_MAP: Record<string, string> = {
  movie: 'tmdb_movies',
  tv: 'tmdb_tv',
  documentary: 'tmdb_documentaries',
  music: 'tmdb_music',
};

interface CacheRow {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  rating: number;
  year: number | null;
  genre: string | null;
  overview: string | null;
  cast: string | null;
  director: string | null;
  runtime: number | null;
  category: string;
}

function rowToTmdbResult(row: CacheRow, type: TmdbMediaType): TmdbResult {
  return {
    id: row.tmdb_id,
    title: row.title,
    year: row.year,
    poster: row.poster_url,
    rating: row.rating,
    type,
    providers: [],
    has_th_providers: false,
    origin_country: null,
  };
}

/**
 * Query Supabase cache for items of a given type, ordered by rating or year.
 * Returns items in TmdbResult format.
 */
export async function queryCacheTable(
  type: TmdbMediaType,
  category: TmdbCategory,
  page: number = 1,
  pageSize: number = 20
): Promise<{ results: TmdbResult[]; total: number; source: 'cache' | 'none' }> {
  const table = TABLE_MAP[type];
  if (!table) return { results: [], total: 0, source: 'none' };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { results: [], total: 0, source: 'none' };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const orderColumn = category === 'top_rated' ? 'rating' : 'rating';
  const orderDesc = true;

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .order(orderColumn, { ascending: !orderDesc })
    .range(from, to);

  if (error || !data || data.length === 0) {
    return { results: [], total: 0, source: 'none' };
  }

  const results = data.map((row) => rowToTmdbResult(row as CacheRow, type));
  return { results, total: count ?? results.length, source: 'cache' };
}

/**
 * Query Supabase cache for a specific item by TMDb ID.
 * Returns null if not cached.
 */
export async function getCachedItem(
  tmdbId: number,
  type: TmdbMediaType
): Promise<CacheRow | null> {
  const table = TABLE_MAP[type];
  if (!table) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single();

  if (error || !data) return null;
  return data as CacheRow;
}

/**
 * Cache a TMDb item into the appropriate Supabase table.
 * Uses upsert to avoid duplicates.
 */
export async function cacheTmdbItem(
  row: CacheRow & { type: TmdbMediaType }
): Promise<void> {
  const table = TABLE_MAP[row.type];
  if (!table) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  await supabase.from(table).upsert({
    tmdb_id: row.tmdb_id,
    title: row.title,
    poster_url: row.poster_url,
    rating: row.rating,
    year: row.year,
    genre: row.genre,
    overview: row.overview,
    cast: row.cast,
    director: row.director,
    runtime: row.runtime,
    category: row.category || 'popular',
  }, { onConflict: 'tmdb_id' });
}

/**
 * Cache-first fetch: tries Supabase first, returns null on cache miss.
 * The caller should fall back to TMDb API and then call cacheTmdbItem().
 */
export async function fetchFromCache(
  type: TmdbMediaType,
  category: TmdbCategory,
  page: number = 1,
  pageSize: number = 20
): Promise<{ results: TmdbResult[]; total: number } | null> {
  const cached = await queryCacheTable(type, category, page, pageSize);
  if (cached.source === 'cache' && cached.results.length > 0) {
    return { results: cached.results, total: cached.total };
  }
  return null;
}
