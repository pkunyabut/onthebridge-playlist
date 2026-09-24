import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  TMDB_IMAGE_BASE,
  DEFAULT_LANGUAGE,
  DEFAULT_WATCH_REGION,
  DEFAULT_COUNTRY,
  WATCH_REGIONS,
  collectProvidersFromRegions,
  type WatchRegion,
  type TmdbMediaType,
  type TmdbResult,
  type TmdbSearchResponse,
} from '@/lib/tmdb';
import { fetchTmdb, TmdbApiError } from '@/lib/tmdb-client';
import { tmdbSearchCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

interface TmdbSearchItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
  original_language?: string;
  origin_country?: string[];
  production_countries?: { iso_3166_1: string; name: string }[];
  'watch/providers'?: {
    results?: Record<string, {
      flatrate?: { provider_id: number }[];
      ads?: { provider_id: number }[];
      free?: { provider_id: number }[];
      buy?: { provider_id: number }[];
      rent?: { provider_id: number }[];
    }>;
  };
}

// TMDb search has no country filter, so a country filter is applied by matching the
// result's original_language (the country picker is about where the title is from).
const LANGUAGE_BY_COUNTRY: Record<string, string> = {
  TH: 'th',
  KR: 'ko',
  CN: 'zh',
  JP: 'ja',
  US: 'en',
};

async function fetchProviders(
  type: TmdbMediaType,
  id: number,
  apiKey: string,
  watchRegion: WatchRegion = DEFAULT_WATCH_REGION,
): Promise<{ providers: TmdbResult['providers']; has_th_providers: boolean }> {
  const endpointType = type === 'documentary' || type === 'music' ? 'movie' : type;
  try {
    const data = await fetchTmdb(`/${endpointType}/${id}`, {
      append_to_response: 'watch/providers',
      language: DEFAULT_LANGUAGE,
    }, apiKey);
    const provData = (data as { 'watch/providers'?: TmdbSearchItem['watch/providers'] })['watch/providers'];
    if (!provData) return { providers: [], has_th_providers: false };
    const collected = collectProvidersFromRegions(provData, WATCH_REGIONS);
    return { providers: collected.providers, has_th_providers: collected.has_th_providers };
  } catch (error) {
    if (error instanceof TmdbApiError && error.status !== 429) {
      console.warn(`[TMDb] Provider fetch failed for ${type}/${id}: ${error.status}`);
    }
    return { providers: [], has_th_providers: false };
  }
}

function getOriginCountry(item: TmdbSearchItem, type: TmdbMediaType): string | null {
  if (type === 'tv' && item.origin_country && item.origin_country.length > 0) {
    return item.origin_country[0];
  }
  if (type === 'movie' && item.production_countries && item.production_countries.length > 0) {
    return item.production_countries[0].iso_3166_1;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const type: TmdbMediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const language = searchParams.get('language') || DEFAULT_LANGUAGE;
  const watchRegion: WatchRegion = (WATCH_REGIONS as readonly string[]).includes(searchParams.get('watch_region') || '')
    ? (searchParams.get('watch_region') as WatchRegion)
    : DEFAULT_WATCH_REGION;
  const country = searchParams.get('country') || DEFAULT_COUNTRY;

  if (!q) {
    return NextResponse.json({ results: [], total_pages: 0, page: 1 });
  }

  const cacheKey = `${type}:${q.toLowerCase()}:${page}:${language}:${watchRegion}:${country}`;
  const cached = tmdbSearchCache.get(cacheKey);
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    // TMDb has no free-text search on the discover endpoints, so always search and then
    // narrow by the selected country's original language when a country filter is on.
    const searchUrl = `/search/${type}?query=${encodeURIComponent(q)}&page=${page}&include_adult=false&language=${language}`;

    const searchData = await fetchTmdb(searchUrl, {}, apiKey) as { results?: TmdbSearchItem[]; total_pages?: number; page?: number };
    let rawResults = searchData.results || [];

    const countryLanguage = country !== DEFAULT_COUNTRY ? LANGUAGE_BY_COUNTRY[country] : undefined;
    if (countryLanguage) {
      rawResults = rawResults.filter((item) => item.original_language === countryLanguage);
    }

    const results: TmdbResult[] = await Promise.all(
      rawResults.map(async (item) => {
        const title = (type === 'movie' ? item.title : item.name) || 'ไม่ทราบชื่อ';
        const dateStr = type === 'movie' ? item.release_date : item.first_air_date;
        const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;
        const { providers, has_th_providers } = await fetchProviders(
          type,
          item.id,
          apiKey,
          watchRegion
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
          origin_country: getOriginCountry(item, type) ?? (countryLanguage ? country : null),
        };
      })
    );

    const responseBody: TmdbSearchResponse = {
      results,
      total_pages: searchData.total_pages || 0,
      page: searchData.page || page,
    };

    tmdbSearchCache.set(cacheKey, responseBody);

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[TMDb] Search error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ TMDb' }, { status: 500 });
  }
}
