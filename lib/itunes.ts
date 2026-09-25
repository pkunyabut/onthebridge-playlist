/**
 * Real music data from Apple (free, no API key):
 * - Thai top-songs chart: rss.applemarketingtools.com (Apple Music "most played", TH)
 * - Search / lookup: itunes.apple.com/search and /lookup (country=TH) — includes a
 *   30-second preview clip, which is the only audio the site plays.
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
const CHART_URL = (limit: number) =>
  `https://rss.applemarketingtools.com/api/v2/th/music/most-played/${limit}/songs.json`;

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

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Music service error (${res.status})`);
  return res.json();
}

/** Look up tracks by iTunes id (keeps the order of `ids`). */
export async function lookupTracks(ids: number[]): Promise<MusicTrack[]> {
  if (ids.length === 0) return [];
  const data = (await getJson(
    `https://itunes.apple.com/lookup?id=${ids.join(',')}&country=${COUNTRY}&entity=song`,
  )) as { results?: RawItunesTrack[] };
  const byId = new Map<number, MusicTrack>();
  for (const r of data.results ?? []) {
    const track = toTrack(r);
    if (track) byId.set(track.trackId, track);
  }
  return ids.map((id) => byId.get(id)).filter((t): t is MusicTrack => !!t);
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

/** Apple Music "most played in Thailand" chart, with previews filled in via lookup. */
export async function fetchThaiTopSongs(limit = 50): Promise<MusicTrack[]> {
  const feed = (await getJson(CHART_URL(limit))) as { feed?: { results?: { id: string }[] } };
  const ids = (feed.feed?.results ?? []).map((r) => parseInt(r.id, 10)).filter((n) => Number.isFinite(n));
  return lookupTracks(ids);
}
