import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  TMDB_API_BASE,
  TMDB_IMAGE_BASE,
  WATCH_REGION,
  mapProviderIdsToPlatforms,
  type TmdbMediaType,
  type TmdbResult,
  type TmdbSearchResponse,
} from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: TmdbSearchResponse; expires: number }>();

interface TmdbSearchItem {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  vote_average?: number;
}

interface TmdbWatchProvider {
  provider_id: number;
}

interface TmdbWatchProvidersResponse {
  'watch/providers'?: {
    results?: Record<
      string,
      {
        flatrate?: TmdbWatchProvider[];
        ads?: TmdbWatchProvider[];
        free?: TmdbWatchProvider[];
      }
    >;
  };
}

async function fetchProviders(type: TmdbMediaType, id: number, apiKey: string): Promise<TmdbResult['providers']> {
  try {
    const res = await fetch(
      `${TMDB_API_BASE}/${type}/${id}?api_key=${apiKey}&append_to_response=watch/providers`
    );
    if (!res.ok) return [];
    const data: TmdbWatchProvidersResponse = await res.json();
    const regional = data['watch/providers']?.results?.[WATCH_REGION];
    const providerIds = [
      ...(regional?.flatrate ?? []),
      ...(regional?.ads ?? []),
      ...(regional?.free ?? []),
    ].map((p) => p.provider_id);
    return mapProviderIdsToPlatforms(providerIds);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const type: TmdbMediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  if (!q) {
    return NextResponse.json({ results: [], total_pages: 0, page: 1 });
  }

  const cacheKey = `${type}:${q.toLowerCase()}:${page}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const searchUrl = `${TMDB_API_BASE}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(q)}&page=${page}&include_adult=false`;
    const searchRes = await fetch(searchUrl);

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'ค้นหาไม่สำเร็จ กรุณาลองใหม่' }, { status: searchRes.status });
    }

    const searchData: { results?: TmdbSearchItem[]; total_pages?: number; page?: number } = await searchRes.json();
    const rawResults = searchData.results || [];

    const results: TmdbResult[] = await Promise.all(
      rawResults.map(async (item) => {
        const title = (type === 'movie' ? item.title : item.name) || 'ไม่ทราบชื่อ';
        const dateStr = type === 'movie' ? item.release_date : item.first_air_date;
        const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;
        const providers = await fetchProviders(type, item.id, apiKey);

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

    const responseBody: TmdbSearchResponse = {
      results,
      total_pages: searchData.total_pages || 0,
      page: searchData.page || page,
    };

    cache.set(cacheKey, { data: responseBody, expires: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(responseBody);
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ TMDb' }, { status: 500 });
  }
}
