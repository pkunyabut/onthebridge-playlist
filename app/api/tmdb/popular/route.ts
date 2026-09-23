import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPopularTmdb,
  type TmdbCategory,
  type TmdbMediaType,
  type TmdbPopularResponse,
} from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: TmdbPopularResponse; expires: number }>();

// GET /api/tmdb/popular — public endpoint for the landing page browse grid.
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type: TmdbMediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const category: TmdbCategory = searchParams.get('category') === 'top_rated' ? 'top_rated' : 'popular';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const cacheKey = `${type}:${category}:${page}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const responseBody = await fetchPopularTmdb(type, category, page, apiKey);
    cache.set(cacheKey, { data: responseBody, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(responseBody);
  } catch {
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ TMDb' }, { status: 500 });
  }
}
