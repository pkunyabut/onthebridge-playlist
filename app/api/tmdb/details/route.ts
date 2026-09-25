import { NextRequest, NextResponse } from 'next/server';
import { fetchTmdb, TmdbApiError } from '@/lib/tmdb-client';
import { DEFAULT_LANGUAGE, DEFAULT_WATCH_REGION } from '@/lib/tmdb';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

export interface DetailProvider {
  provider_id: number;
  provider_name: string;
  logo: string | null;
}

export interface TmdbDetails {
  overview: string | null;
  /** True when the Thai overview was empty and the English one is shown instead. */
  overview_is_english: boolean;
  tagline: string | null;
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  /** Director for movies, creators for series. */
  directors: string[];
  cast: string[];
  trailer: { key: string; name: string; language: string } | null;
  providers: { stream: DetailProvider[]; rent: DetailProvider[]; buy: DetailProvider[] };
  /** TMDb's per-title "where to watch in Thailand" page. */
  watch_link: string | null;
}

interface RawProvider { provider_id: number; provider_name: string; logo_path: string | null }
interface RawVideo { key: string; name: string; site: string; type: string; official?: boolean; iso_639_1?: string }
interface RawDetails {
  overview?: string;
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { name: string }[];
  created_by?: { name: string }[];
  credits?: {
    cast?: { name: string; order?: number }[];
    crew?: { name: string; job?: string }[];
  };
  videos?: { results?: RawVideo[] };
  'watch/providers'?: {
    results?: Record<string, { link?: string; flatrate?: RawProvider[]; free?: RawProvider[]; ads?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] }>;
  };
}

const detailsCache = new LruCache<TmdbDetails>(6 * 60 * 60 * 1000, 300);

const LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

function toProviders(list: RawProvider[] | undefined, seen: Set<number>): DetailProvider[] {
  const out: DetailProvider[] = [];
  for (const p of list ?? []) {
    if (seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    out.push({ provider_id: p.provider_id, provider_name: p.provider_name, logo: p.logo_path ? `${LOGO_BASE}${p.logo_path}` : null });
  }
  return out;
}

/** Thai trailer first, then English, then anything; official trailers beat teasers. */
function pickTrailer(videos: RawVideo[]): TmdbDetails['trailer'] {
  const youtube = videos.filter((v) => v.site === 'YouTube' && v.key);
  if (youtube.length === 0) return null;
  const score = (v: RawVideo) =>
    (v.iso_639_1 === 'th' ? 100 : v.iso_639_1 === 'en' ? 50 : 0) +
    (v.type === 'Trailer' ? 20 : v.type === 'Teaser' ? 10 : 0) +
    (v.official ? 5 : 0);
  const best = [...youtube].sort((a, b) => score(b) - score(a))[0];
  return { key: best.key, name: best.name, language: best.iso_639_1 ?? '' };
}

// GET /api/tmdb/details?type=movie|tv|documentary|music&id=123 — the extra info shown in
// the card preview (synopsis, trailer, cast, runtime, where to watch in Thailand).
export async function GET(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const type = params.get('type') ?? 'movie';
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'id ไม่ถูกต้อง' }, { status: 400 });
  }
  // Documentaries and music titles are TMDb movies (genre 99 / 10402).
  const endpoint = type === 'tv' ? 'tv' : 'movie';

  const cacheKey = `${endpoint}:${id}`;
  const cached = detailsCache.get(cacheKey);
  if (cached !== null) return NextResponse.json(cached);

  try {
    const data = (await fetchTmdb(
      `/${endpoint}/${id}`,
      {
        language: DEFAULT_LANGUAGE,
        append_to_response: 'credits,videos,watch/providers',
        include_video_language: 'th,en,null',
      },
      apiKey,
    )) as RawDetails;

    let overview = data.overview?.trim() || null;
    let overviewIsEnglish = false;
    if (!overview) {
      const en = (await fetchTmdb(`/${endpoint}/${id}`, { language: 'en-US' }, apiKey)) as RawDetails;
      overview = en.overview?.trim() || null;
      overviewIsEnglish = !!overview;
    }

    const directors =
      endpoint === 'tv'
        ? (data.created_by ?? []).map((c) => c.name)
        : (data.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name);

    const cast = [...(data.credits?.cast ?? [])]
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .slice(0, 5)
      .map((c) => c.name);

    const region = data['watch/providers']?.results?.[DEFAULT_WATCH_REGION];
    const seen = new Set<number>();
    const stream = toProviders([...(region?.flatrate ?? []), ...(region?.free ?? []), ...(region?.ads ?? [])], seen);
    const rent = toProviders(region?.rent, seen);
    const buy = toProviders(region?.buy, seen);

    const details: TmdbDetails = {
      overview,
      overview_is_english: overviewIsEnglish,
      tagline: data.tagline?.trim() || null,
      runtime: data.runtime || data.episode_run_time?.[0] || null,
      seasons: endpoint === 'tv' ? data.number_of_seasons ?? null : null,
      episodes: endpoint === 'tv' ? data.number_of_episodes ?? null : null,
      genres: (data.genres ?? []).map((g) => g.name),
      directors: Array.from(new Set(directors)).slice(0, 3),
      cast,
      trailer: pickTrailer(data.videos?.results ?? []),
      providers: { stream, rent, buy },
      watch_link: region?.link ?? null,
    };

    detailsCache.set(cacheKey, details);
    return NextResponse.json(details);
  } catch (error) {
    if (error instanceof TmdbApiError) {
      const status = error.status === 404 ? 404 : 502;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'ดึงรายละเอียดไม่สำเร็จ' }, { status: 500 });
  }
}
