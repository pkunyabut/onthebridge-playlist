/**
 * TMDb API client with exponential backoff for 429/500 responses.
 * Handles rate limiting, retries, and proper error handling.
 */

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

export class TmdbApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'TmdbApiError';
  }
}

export function isTmdbRetryable(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export function getRetryAfterMs(status: number, retryAttempt: number): number {
  // Use Retry-After header value if available, otherwise exponential backoff
  const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
  // Add jitter to avoid thundering herd
  const jitter = Math.random() * 200;
  return baseDelay + jitter;
}

export async function fetchTmdb(
  path: string,
  params: Record<string, string> = {},
  apiKey: string,
  retryCount = 0,
): Promise<unknown> {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (networkError) {
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryAfterMs(0, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchTmdb(path, params, apiKey, retryCount + 1);
    }
    throw new TmdbApiError(0, 'Network error connecting to TMDb');
  }

  if (response.status === 429) {
    if (retryCount < MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : getRetryAfterMs(429, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchTmdb(path, params, apiKey, retryCount + 1);
    }
    throw new TmdbApiError(429, 'TMDb rate limit exceeded. Please try again later.');
  }

  if (isTmdbRetryable(response.status)) {
    if (retryCount < MAX_RETRIES) {
      const delay = getRetryAfterMs(response.status, retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchTmdb(path, params, apiKey, retryCount + 1);
    }
    throw new TmdbApiError(response.status, `TMDb server error (${response.status})`);
  }

  if (!response.ok) {
    throw new TmdbApiError(response.status, `TMDb API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch with cache — checks cache first, then makes API call with backoff.
 */
export async function fetchTmdbCached<T>(
  cacheKey: string,
  path: string,
  params: Record<string, string>,
  apiKey: string,
  cache: { get(key: string): T | null; set(key: string, data: T): void },
): Promise<T> {
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const data = (await fetchTmdb(path, params, apiKey)) as T;
  cache.set(cacheKey, data);
  return data;
}
