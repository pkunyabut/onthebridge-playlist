import { NextRequest, NextResponse } from 'next/server';
import { fetchGenres, DEFAULT_LANGUAGE } from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';
import { TmdbApiError } from '@/lib/tmdb-client';

export const dynamic = 'force-dynamic';

// GET /api/tmdb/genres — TMDb genre lists in Thai for the landing page filter (item 3).
// Movie and TV lists are kept separate on purpose: the same Thai genre word has a
// different TMDb id on each side.
const genreCache = new LruCache<{ movie: { id: number; name: string }[]; tv: { id: number; name: string }[] }>(
  24 * 60 * 60 * 1000,
  20
);

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const language = new URL(request.url).searchParams.get('language') || DEFAULT_LANGUAGE;
  const cached = genreCache.get(language);
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    const data = await fetchGenres(apiKey, language);
    genreCache.set(language, data);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[TMDb] Genre fetch error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }, { status: 500 });
  }
}