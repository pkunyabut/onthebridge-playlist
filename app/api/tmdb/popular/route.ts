import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPopularTmdb,
  DEFAULT_LANGUAGE,
  DEFAULT_WATCH_REGION,
  DEFAULT_COUNTRY,
  WATCH_REGIONS,
  type WatchRegion,
  type TmdbCategory,
  type TmdbMediaType,
  type BrowseMode,
} from '@/lib/tmdb';
import { tmdbPopularCache } from '@/lib/tmdb-cache';
import { TmdbApiError } from '@/lib/tmdb-client';

export const dynamic = 'force-dynamic';

// GET /api/tmdb/popular — public endpoint for the landing page browse grid.
// Cache-first: checks in-memory LRU cache, then falls back to TMDb API.
//
// Params (items 3-5 of the user feedback):
//   type      movie | tv | documentary | music
//   category  popular | top_rated
//   mode      streaming (default) | theaters   → theaters = /movie/now_playing?region=TH
//   genre     TMDb genre id (combined with the type tab's own genre)
//   providers comma/pipe list of TMDb provider ids ("only my services")
//   origin    comma/pipe list of origin country codes (Thai/Asia section)
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type: TmdbMediaType = (searchParams.get('type') === 'tv' || searchParams.get('type') === 'documentary' || searchParams.get('type') === 'music')
    ? searchParams.get('type') as TmdbMediaType
    : 'movie';
  const category: TmdbCategory = searchParams.get('category') === 'top_rated' ? 'top_rated' : 'popular';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const language = searchParams.get('language') || DEFAULT_LANGUAGE;
  const watchRegion: WatchRegion = (WATCH_REGIONS as readonly string[]).includes(searchParams.get('watch_region') || '')
    ? (searchParams.get('watch_region') as WatchRegion)
    : DEFAULT_WATCH_REGION;
  const country = searchParams.get('country') || DEFAULT_COUNTRY;

  // Theaters mode lists movies only — TMDb publishes no theatrical feed for TV/music,
  // so those types silently stay on the streaming path instead of showing a fake list.
  const modeParam = searchParams.get('mode');
  const mode: BrowseMode = modeParam === 'theaters' ? 'theaters' : 'streaming';

  const genreIdRaw = searchParams.get('genre');
  const genreId = genreIdRaw && /^\d+$/.test(genreIdRaw) ? genreIdRaw : null;

  // Accept "8,119" or "8|119"; anything non-numeric is dropped rather than forwarded.
  const providerIds = (searchParams.get('providers') || '')
    .split(/[,\|]/)
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  // Only allowlist-shaped ISO country codes are forwarded to TMDb.
  const originCountries = (searchParams.get('origin') || '')
    .split(/[,\|]/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z]{2,3}$/.test(value));

  const cacheKey = [
    type,
    category,
    page,
    language,
    watchRegion,
    country,
    mode,
    genreId ?? '-',
    providerIds.join('.'),
    originCountries.join('.'),
  ].join(':');
  const cached = tmdbPopularCache.get(cacheKey);
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    const responseBody = await fetchPopularTmdb(type, category, page, apiKey, language, watchRegion, country, {
      mode,
      genreId,
      providerIds,
      originCountries,
    });

    tmdbPopularCache.set(cacheKey, responseBody);

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[TMDb] Popular fetch error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }, { status: 500 });
  }
}