import { NextRequest, NextResponse } from 'next/server';
import { fetchTmdb } from '@/lib/tmdb-client';
import { DEFAULT_LANGUAGE } from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';
import type { EpisodeInfo } from '@/app/api/tmdb/details/route';

export const dynamic = 'force-dynamic';

export interface SeriesSchedule {
  next: EpisodeInfo | null;
  last: EpisodeInfo | null;
  status: string | null;
}

interface RawEpisode {
  season_number?: number;
  episode_number?: number;
  air_date?: string | null;
  name?: string | null;
}

const MAX_IDS = 40;
// air dates change when a new episode airs — keep this shorter than the 6h details cache
const scheduleCache = new LruCache<SeriesSchedule>(3 * 60 * 60 * 1000, 500);

function toEpisode(e: RawEpisode | null | undefined): EpisodeInfo | null {
  if (!e || !e.episode_number) return null;
  return { season: e.season_number ?? 1, episode: e.episode_number, air_date: e.air_date || null, name: e.name || null };
}

// POST /api/tmdb/schedule — { ids: [TMDB tv ids] } → { schedules: { [id]: { next, last, status } } }
// One request for all saved series, so dashboard cards can show "📅 new episode Fri 2 Oct".
export async function POST(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown[] } | null;
  const ids = Array.from(
    new Set((body?.ids ?? []).filter((v): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0)),
  ).slice(0, MAX_IDS);

  const schedules: Record<number, SeriesSchedule | null> = {};
  await Promise.all(
    ids.map(async (id) => {
      const cached = scheduleCache.get(String(id));
      if (cached !== null) {
        schedules[id] = cached;
        return;
      }
      try {
        const data = (await fetchTmdb(`/tv/${id}`, { language: DEFAULT_LANGUAGE }, apiKey)) as {
          next_episode_to_air?: RawEpisode | null;
          last_episode_to_air?: RawEpisode | null;
          status?: string;
        };
        const schedule: SeriesSchedule = {
          next: toEpisode(data.next_episode_to_air),
          last: toEpisode(data.last_episode_to_air),
          status: data.status ?? null,
        };
        scheduleCache.set(String(id), schedule);
        schedules[id] = schedule;
      } catch {
        schedules[id] = null; // not cached — retry next time
      }
    }),
  );

  return NextResponse.json({ schedules });
}
