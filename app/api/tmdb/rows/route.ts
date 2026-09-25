import { NextRequest, NextResponse } from 'next/server';
import {
  fetchTrendingRow,
  fetchTopRatedRow,
  fetchRecommendationsForTitles,
  fetchOriginRow,
  getOriginRegion,
  DEFAULT_LANGUAGE,
  DEFAULT_WATCH_REGION,
  type TmdbRowItem,
} from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';
import { TmdbApiError } from '@/lib/tmdb-client';

export const dynamic = 'force-dynamic';

// GET /api/tmdb/rows — curated suggestion rows for the landing page.
//
// kind=trending                     → กำลังมาแรง   (/trending/movie/week)
// kind=top_rated                    → คะแนนสูงสุด   (/movie/top_rated)
// kind=for_you&titles=A,B,C         → แนะนำสำหรับคุณ (/search/multi → /movie|tv/{id}/recommendations,
//                                                       falls back to trending when the watchlist is empty)
// kind=origin&region=TH|KR|...|ASIA → item 7 Thai/Asian rows (/discover with_origin_country)
const rowCache = new LruCache<{ kind: string; items: TmdbRowItem[]; source: string }>();

export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') || 'trending';
  const language = searchParams.get('language') || DEFAULT_LANGUAGE;
  const titlesRaw = searchParams.get('titles') || '';
  const titles = titlesRaw
    .split('|')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  const regionKey = (searchParams.get('region') || 'TH').toUpperCase();
  const mediaParam = searchParams.get('media') === 'tv' ? 'tv' : 'movie';

  const cacheKey = [kind, language, mediaParam, regionKey, titles.join('~')].join(':');
  const cached = rowCache.get(cacheKey);
  if (cached !== null) {
    return NextResponse.json(cached);
  }

  try {
    let items: TmdbRowItem[] = [];
    let source = kind;

    if (kind === 'trending') {
      items = await fetchTrendingRow(apiKey, language);
      source = 'trending/movie/week';
    } else if (kind === 'top_rated') {
      items = await fetchTopRatedRow(apiKey, language, DEFAULT_WATCH_REGION);
      source = 'movie/top_rated';
    } else if (kind === 'for_you') {
      if (titles.length > 0) {
        items = await fetchRecommendationsForTitles(apiKey, titles, language);
        source = 'recommendations';
      }
      if (items.length === 0) {
        // Empty/unmatched watchlist → trending, exactly as specified.
        items = await fetchTrendingRow(apiKey, language);
        source = 'trending/movie/week (fallback)';
      }
    } else if (kind === 'origin') {
      const region = getOriginRegion(regionKey);
      if (!region) {
        return NextResponse.json({ error: 'ไม่รู้จักภูมิภาคนี้' }, { status: 400 });
      }
      items = await fetchOriginRow(apiKey, region.countries, language, mediaParam);
      source = `discover/${mediaParam}?with_origin_country=${region.countries.join('|')}`;
    } else {
      return NextResponse.json({ error: 'ไม่รู้จักชนิดแถวแนะนำ' }, { status: 400 });
    }

    const body = { kind, items, source };
    rowCache.set(cacheKey, body);
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[TMDb] Row fetch error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }, { status: 500 });
  }
}