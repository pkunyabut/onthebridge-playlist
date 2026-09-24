import { NextRequest, NextResponse } from 'next/server';
import { fetchPopularMusic, type MusicBrainzResponse } from '@/lib/musicbrainz';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: MusicBrainzResponse; expires: number }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const cacheKey = `music:popular:${page}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const data = await fetchPopularMusic(page);
    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ MusicBrainz' },
      { status: 500 }
    );
  }
}
