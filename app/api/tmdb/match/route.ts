import { NextRequest, NextResponse } from 'next/server';
import { fetchTmdb } from '@/lib/tmdb-client';
import { DEFAULT_LANGUAGE, TMDB_IMAGE_BASE } from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

export interface TmdbMatch {
  tmdb_id: number;
  media: 'movie' | 'tv';
  poster: string | null;
  rating: number;
}

interface MatchRequestItem {
  key: string;
  title: string;
  year?: number | null;
  /** Our MediaType: movie | series | documentary | talkshow | music | news */
  type?: string;
}

interface RawSearchResult {
  id: number;
  media_type?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

const MAX_ITEMS = 60;
const matchCache = new LruCache<TmdbMatch | 'none'>(24 * 60 * 60 * 1000, 1000);

function toMatch(r: RawSearchResult, media: 'movie' | 'tv'): TmdbMatch {
  return {
    tmdb_id: r.id,
    media,
    poster: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
    rating: Math.round((r.vote_average || 0) * 10) / 10,
  };
}

/**
 * A wrong poster is worse than none: when the saved item has a year, only accept a
 * TMDb result released within ±1 year of it (e.g. "เดอะรันเนอร์" 2026 must not match
 * The Front Runner 2018).
 */
function yearFits(r: RawSearchResult, year: number | null | undefined): boolean {
  if (!year) return true;
  const date = r.release_date || r.first_air_date;
  const y = date ? parseInt(date.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) && Math.abs(y - year) <= 1;
}

async function findMatch(apiKey: string, item: MatchRequestItem): Promise<TmdbMatch | null> {
  const media: 'movie' | 'tv' = ['series', 'talkshow', 'news'].includes(item.type ?? '') ? 'tv' : 'movie';
  const base = { query: item.title, language: DEFAULT_LANGUAGE, include_adult: 'false' };

  // 1) same kind + exact year, 2) same kind without the year filter (a hand-typed year may be off by one)
  const attempts: Record<string, string>[] = [];
  if (item.year) {
    attempts.push({ ...base, [media === 'tv' ? 'first_air_date_year' : 'year']: String(item.year) });
  }
  attempts.push(base);

  for (const params of attempts) {
    const data = (await fetchTmdb(`/search/${media}`, params, apiKey)) as { results?: RawSearchResult[] };
    const hit = data.results?.find((r) => yearFits(r, item.year));
    if (hit) return toMatch(hit, media);
  }

  // 3) the saved type may be wrong (e.g. a series saved as "movie") — try both kinds
  const multi = (await fetchTmdb('/search/multi', base, apiKey)) as { results?: RawSearchResult[] };
  const hit = multi.results?.find((r) => (r.media_type === 'movie' || r.media_type === 'tv') && yearFits(r, item.year));
  return hit ? toMatch(hit, hit.media_type as 'movie' | 'tv') : null;
}

// POST /api/tmdb/match — { items: [{ key, title, year, type }] } → { matches: { [key]: TmdbMatch | null } }
// Saved watchlist rows only store title/year/type, so posters and the card preview
// are looked up on TMDb by title (+ year) when the list is shown.
export async function POST(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { items?: MatchRequestItem[] } | null;
  const items = (body?.items ?? [])
    .filter((i) => i && typeof i.key === 'string' && typeof i.title === 'string' && i.title.trim())
    // TMDb has no songs; never guess a movie poster for a music item.
    .filter((i) => i.type !== 'music')
    .slice(0, MAX_ITEMS);

  const matches: Record<string, TmdbMatch | null> = {};
  await Promise.all(
    items.map(async (item) => {
      const cacheKey = `${item.type ?? ''}|${item.title.trim().toLowerCase()}|${item.year ?? ''}`;
      const cached = matchCache.get(cacheKey);
      if (cached !== null) {
        matches[item.key] = cached === 'none' ? null : cached;
        return;
      }
      try {
        const match = await findMatch(apiKey, { ...item, title: item.title.trim() });
        matchCache.set(cacheKey, match ?? 'none');
        matches[item.key] = match;
      } catch {
        matches[item.key] = null; // not cached — retry next time
      }
    }),
  );

  return NextResponse.json({ matches });
}
