import { NextRequest, NextResponse } from 'next/server';
import { fetchTmdb, TmdbApiError } from '@/lib/tmdb-client';
import { DEFAULT_WATCH_REGION, SERVICE_OPTIONS, type WatchRegion } from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

export interface WatchProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
  /** Our ServiceOption key when this provider is one of the 11 supported services. */
  service_key: string | null;
}

const providerCache = new LruCache<WatchProviderEntry[]>(24 * 60 * 60 * 1000, 20);

// GET /api/tmdb/providers?region=TH — real TMDb provider list (id, Thai/English name,
// logo) for the "เลือกบริการที่คุณดูอยู่" chips (item 4). Logos come straight from
// TMDb's own /watch/providers catalog, not from a hand-made icon list.
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const region = (new URL(request.url).searchParams.get('region') || DEFAULT_WATCH_REGION).toUpperCase() as WatchRegion;

  const cached = providerCache.get(region);
  if (cached !== null) {
    return NextResponse.json({ region, providers: cached });
  }

  try {
    const [movieData, tvData] = await Promise.all([
      fetchTmdb('/watch/providers/movie', { watch_region: region }, apiKey) as Promise<{
        results?: { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number }[];
      }>,
      fetchTmdb('/watch/providers/tv', { watch_region: region }, apiKey) as Promise<{
        results?: { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number }[];
      }>,
    ]);

    const merged = new Map<number, WatchProviderEntry>();
    for (const raw of [...(movieData.results ?? []), ...(tvData.results ?? [])]) {
      if (merged.has(raw.provider_id)) continue;
      const service = SERVICE_OPTIONS.find((s) => s.providerIds.includes(raw.provider_id));
      merged.set(raw.provider_id, {
        provider_id: raw.provider_id,
        provider_name: raw.provider_name,
        logo_path: raw.logo_path,
        display_priority: raw.display_priority,
        service_key: service ? service.key : null,
      });
    }

    const providers = Array.from(merged.values()).sort(
      (a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999)
    );

    providerCache.set(region, providers);
    return NextResponse.json({ region, providers });
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[TMDb] Provider catalog error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }, { status: 500 });
  }
}