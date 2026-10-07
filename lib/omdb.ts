/**
 * Critic scores (Rotten Tomatoes, Metacritic) from OMDb — scores only, no review text.
 * OMDb free tier = 1,000 requests/day, so callers cache results (see app/api/ratings).
 */
export interface CriticScores {
  /** e.g. "85%" */
  rotten_tomatoes: string | null;
  /** e.g. "67/100" */
  metacritic: string | null;
}

interface OmdbResponse {
  Response?: string;
  Error?: string;
  Ratings?: { Source?: string; Value?: string }[];
}

const OMDB_URL = 'https://www.omdbapi.com/';

export class OmdbError extends Error {}

/** Returns null when OMDb does not know the title; throws OmdbError on quota/network problems. */
export async function fetchCriticScores(imdbId: string, apiKey: string): Promise<CriticScores | null> {
  const url = new URL(OMDB_URL);
  url.searchParams.set('i', imdbId);
  url.searchParams.set('apikey', apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: 'no-store' });
  } catch {
    throw new OmdbError('network');
  }
  if (!res.ok) throw new OmdbError(`status ${res.status}`);

  const data = (await res.json()) as OmdbResponse;
  if (data.Response === 'False') {
    // "Incorrect IMDb ID." = unknown title; anything else (invalid key, daily limit) is an error
    if (/not found|incorrect imdb id/i.test(data.Error ?? '')) return null;
    throw new OmdbError(data.Error ?? 'omdb error');
  }

  const pick = (source: string) => {
    const value = data.Ratings?.find((r) => r.Source === source)?.Value;
    return value && value !== 'N/A' ? value : null;
  };
  return { rotten_tomatoes: pick('Rotten Tomatoes'), metacritic: pick('Metacritic') };
}
