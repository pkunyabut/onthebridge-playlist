/**
 * TMDb Sync — fetches popular/top-rated items from TMDb API and stores in Supabase cache tables.
 * Run via: POST /api/sync (requires auth)
 * Uses service role key for Supabase writes (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';
import { fetchTmdb, TmdbApiError } from './tmdb-client';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbSyncItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  overview?: string;
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
}

interface TmdbCredits {
  cast?: { name: string }[];
  crew?: { job: string; name: string }[];
}

interface TmdbSyncResult {
  synced: number;
  errors: string[];
}

function getTableForMediaType(type: string): string {
  switch (type) {
    case 'movie': return 'tmdb_movies';
    case 'tv': return 'tmdb_tv';
    case 'documentary': return 'tmdb_documentaries';
    case 'music': return 'tmdb_music';
    default: return 'tmdb_movies';
  }
}

function getEndpointType(type: string): string {
  return type === 'documentary' || type === 'music' ? 'movie' : type;
}

function getGenreParam(type: string): string | null {
  if (type === 'documentary') return '99';
  if (type === 'music') return '10402';
  return null;
}

async function fetchCredits(
  type: string,
  id: number,
  apiKey: string
): Promise<{ cast: string[]; director: string | null }> {
  const endpointType = getEndpointType(type);
  try {
    const data = await fetchTmdb(`/${endpointType}/${id}/credits`, {}, apiKey) as TmdbCredits;
    const cast = (data.cast ?? []).slice(0, 10).map((c) => c.name);
    const director = data.crew?.find((c) => c.job === 'Director')?.name ?? null;
    return { cast, director };
  } catch {
    return { cast: [], director: null };
  }
}

async function syncType(
  type: string,
  category: string,
  apiKey: string,
  supabase: any,
  maxPages: number = 5
): Promise<TmdbSyncResult> {
  const table = getTableForMediaType(type);
  const endpointType = getEndpointType(type);
  const genreParam = getGenreParam(type);
  const sortBy = category === 'top_rated' ? 'vote_average.desc' : 'popularity.desc';
  const language = 'th-TH';

  let synced = 0;
  const errors: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      let path: string;
      if (genreParam) {
        path = `/discover/${endpointType}?with_genres=${genreParam}&sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
      } else if (type === 'tv') {
        path = `/discover/tv?sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
      } else {
        path = `/discover/movie?sort_by=${sortBy}&page=${page}&language=${language}&vote_count.gte=10`;
      }

      const data = await fetchTmdb(path, {}, apiKey) as { results?: TmdbSyncItem[]; total_pages?: number };
      const items = data.results ?? [];
      if (items.length === 0) break;

      // Fetch credits for each item (cast + director)
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const { cast, director } = await fetchCredits(type, item.id, apiKey);
          const title = (type === 'tv' ? item.name : item.title) || 'Untitled';
          const dateStr = type === 'tv' ? item.first_air_date : item.release_date;
          const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;
          const runtime = type === 'tv'
            ? (item.episode_run_time?.[0] ?? null)
            : (item.runtime ?? null);
          const genre = item.genres?.map((g) => g.name).join(', ') ?? null;

          return {
            tmdb_id: item.id,
            title,
            poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
            rating: Math.round((item.vote_average || 0) * 10) / 10,
            year,
            genre,
            overview: item.overview || null,
            cast: cast.join(', '),
            director,
            runtime,
            category,
          };
        })
      );

      // Upsert into Supabase cache
      const { error } = await (supabase as any).from(table).upsert(enrichedItems, { onConflict: 'tmdb_id' });
      if (error) {
        errors.push(`Page ${page}: ${error.message}`);
      } else {
        synced += enrichedItems.length;
      }

      // Respect rate limits — small delay between pages
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      const msg = err instanceof TmdbApiError ? `HTTP ${err.status}` : String(err);
      errors.push(`Page ${page}: ${msg}`);
    }
  }

  return { synced, errors };
}

/**
 * Sync all media types from TMDb into Supabase cache tables.
 * Returns a summary of synced items per type.
 */
export async function syncAllTmdb(apiKey: string): Promise<Record<string, TmdbSyncResult>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  const supabase: any = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const results: Record<string, TmdbSyncResult> = {};

  for (const type of ['movie', 'tv', 'documentary', 'music'] as const) {
    for (const category of ['popular', 'top_rated'] as const) {
      const key = `${type}_${category}`;
      try {
        results[key] = await syncType(type, category, apiKey, supabase, 3);
      } catch (err) {
        results[key] = { synced: 0, errors: [String(err)] };
      }
      // Rate limit pause between types
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}
