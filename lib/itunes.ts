/**
 * Real music data from Apple (free, no API key):
 * - Top-songs charts: rss.applemarketingtools.com (Apple Music "most played") per country
 * - Search / lookup: itunes.apple.com/search and /lookup — includes a 30-second preview
 *   clip, which is the only audio the site plays.
 */

export interface MusicTrack {
  trackId: number;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string | null;
  /** 600×600 album cover */
  cover: string | null;
  /** 30-second preview clip (m4a) — may be missing for some songs */
  previewUrl: string | null;
  /** Apple Music page for the song */
  url: string | null;
}

const COUNTRY = 'TH';

/** Chart chips in the เพลง tab. `store` is the Apple store the chart comes from. */
export const MUSIC_CHARTS = [
  { key: 'th', store: 'TH', flag: '🇹🇭' },
  { key: 'kr', store: 'KR', flag: '🇰🇷' },
  { key: 'jp', store: 'JP', flag: '🇯🇵' },
  { key: 'us', store: 'US', flag: '🌎' },
  { key: 'cn', store: 'CN', flag: '🇨🇳' },
  { key: 'tw', store: 'TW', flag: '🇹🇼' },
] as const;
export type MusicChartKey = (typeof MUSIC_CHARTS)[number]['key'];

/** Stores tried (in order) when a saved song is looked up again by id. */
const LOOKUP_STORES = ['TH', ...MUSIC_CHARTS.map((c) => c.store).filter((s) => s !== 'TH')];

const CHART_URL = (country: string, limit: number) =>
  `https://rss.applemarketingtools.com/api/v2/${country.toLowerCase()}/music/most-played/${limit}/songs.json`;

interface RawItunesTrack {
  wrapperType?: string;
  kind?: string;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

function bigCover(url: string | undefined): string | null {
  return url ? url.replace(/\/\d+x\d+bb\./, '/600x600bb.') : null;
}

function toTrack(r: RawItunesTrack): MusicTrack | null {
  if (!r.trackId || !r.trackName || r.kind !== 'song') return null;
  const year = r.releaseDate ? parseInt(r.releaseDate.slice(0, 4), 10) || null : null;
  return {
    trackId: r.trackId,
    title: r.trackName,
    artist: r.artistName ?? '',
    album: r.collectionName ?? null,
    year,
    genre: r.primaryGenreName ?? null,
    cover: bigCover(r.artworkUrl100),
    previewUrl: r.previewUrl ?? null,
    url: r.trackViewUrl ?? null,
  };
}

/** Apple's chart feed sometimes answers 504 (seen for KR/HK) — retry a few times. */
async function getJson(url: string, attempts = 3): Promise<unknown> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) return await res.json();
      lastError = new Error(`Music service error (${res.status})`);
      if (res.status < 500) break;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw lastError;
}

async function lookupInStore(ids: number[], store: string): Promise<Map<number, MusicTrack>> {
  const byId = new Map<number, MusicTrack>();
  if (ids.length === 0) return byId;
  const data = (await getJson(
    `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${store}&entity=song`,
  )) as { results?: RawItunesTrack[] };
  for (const r of data.results ?? []) {
    const track = toTrack(r);
    if (track) byId.set(track.trackId, track);
  }
  return byId;
}

/**
 * Look up tracks by iTunes id (keeps the order of `ids`). A foreign song may be missing
 * from the Thai store (e.g. only 14/25 of China's chart is), so ids not found in the first
 * store are retried in the other chart stores.
 */
export async function lookupTracks(ids: number[], stores: string[] = LOOKUP_STORES): Promise<MusicTrack[]> {
  const found = new Map<number, MusicTrack>();
  for (const store of stores) {
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length === 0) break;
    const byId = await lookupInStore(missing, store);
    byId.forEach((track, id) => found.set(id, track));
  }
  return ids.map((id) => found.get(id)).filter((t): t is MusicTrack => !!t);
}

export async function searchTracks(term: string, limit = 30): Promise<MusicTrack[]> {
  const params = new URLSearchParams({
    term,
    country: COUNTRY,
    media: 'music',
    entity: 'song',
    limit: String(limit),
  });
  const data = (await getJson(`https://itunes.apple.com/search?${params}`)) as { results?: RawItunesTrack[] };
  return (data.results ?? []).map(toTrack).filter((t): t is MusicTrack => !!t);
}

/**
 * Apple Music "most played" chart for one country, with previews filled in via lookup.
 * Looked up in that country's own store first (it has every charted song), then Thailand.
 */
export async function fetchTopSongs(chart: MusicChartKey = 'th', limit = 50): Promise<MusicTrack[]> {
  const store = MUSIC_CHARTS.find((c) => c.key === chart)?.store ?? 'TH';
  const feed = (await getJson(CHART_URL(store, limit))) as { feed?: { results?: { id: string }[] } };
  const ids = (feed.feed?.results ?? []).map((r) => parseInt(r.id, 10)).filter((n) => Number.isFinite(n));
  return lookupTracks(ids, store === 'TH' ? ['TH'] : [store, 'TH']);
}
