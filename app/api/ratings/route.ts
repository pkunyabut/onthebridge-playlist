import { NextRequest, NextResponse } from 'next/server';
import { fetchCriticScores, OmdbError, type CriticScores } from '@/lib/omdb';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

// OMDb free tier is 1,000/day and scores change slowly → remember each title for a day,
// and let the CDN keep it too.
const scoreCache = new LruCache<CriticScores>(24 * 60 * 60 * 1000, 1000);
const CDN_CACHE = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };

function hasAny(scores: CriticScores): boolean {
  return !!(scores.rotten_tomatoes || scores.metacritic);
}

// GET /api/ratings?imdb=tt3896198 → { scores: { rotten_tomatoes, metacritic } | null }
// No OMDB_API_KEY, unknown title, or any OMDb failure → scores: null (the card just hides).
export async function GET(request: NextRequest) {
  const imdb = new URL(request.url).searchParams.get('imdb') ?? '';
  if (!/^tt\d{5,10}$/.test(imdb)) {
    return NextResponse.json({ error: 'imdb id ไม่ถูกต้อง' }, { status: 400 });
  }

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return NextResponse.json({ scores: null });

  const cached = scoreCache.get(imdb);
  if (cached !== null) return NextResponse.json({ scores: hasAny(cached) ? cached : null }, { headers: CDN_CACHE });

  try {
    // an unknown title is cached as an empty score set (LruCache treats null as a miss)
    const scores = (await fetchCriticScores(imdb, apiKey)) ?? { rotten_tomatoes: null, metacritic: null };
    scoreCache.set(imdb, scores);
    return NextResponse.json({ scores: hasAny(scores) ? scores : null }, { headers: CDN_CACHE });
  } catch (error) {
    if (!(error instanceof OmdbError)) console.error('[OMDb] unexpected error:', error);
    // not cached: a daily-limit or network error should recover by itself
    return NextResponse.json({ scores: null });
  }
}
