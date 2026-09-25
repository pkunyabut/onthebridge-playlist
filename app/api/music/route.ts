import { NextRequest, NextResponse } from 'next/server';
import { fetchThaiTopSongs, lookupTracks, searchTracks, type MusicTrack } from '@/lib/itunes';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

const musicCache = new LruCache<MusicTrack[]>(60 * 60 * 1000, 200);

// GET /api/music?kind=top          — Thai top songs (Apple Music chart)
// GET /api/music?q=bodyslam        — search songs
// GET /api/music?ids=123,456       — look up saved songs (fresh 30s preview links)
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  const ids = (params.get('ids') ?? '')
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 100);

  let cacheKey: string;
  let load: () => Promise<MusicTrack[]>;
  if (ids.length > 0) {
    cacheKey = `ids:${ids.join(',')}`;
    load = () => lookupTracks(ids);
  } else if (q) {
    if (q.length > 100) return NextResponse.json({ error: 'คำค้นยาวเกินไป' }, { status: 400 });
    cacheKey = `q:${q.toLowerCase()}`;
    load = () => searchTracks(q);
  } else {
    cacheKey = 'top';
    load = () => fetchThaiTopSongs(50);
  }

  const cached = musicCache.get(cacheKey);
  if (cached !== null) return NextResponse.json({ tracks: cached });

  try {
    const tracks = await load();
    musicCache.set(cacheKey, tracks);
    return NextResponse.json({ tracks });
  } catch (err) {
    console.error('music route error:', err);
    return NextResponse.json({ error: 'ดึงข้อมูลเพลงไม่สำเร็จ' }, { status: 502 });
  }
}
