'use client';

import { useEffect, useState } from 'react';
import type { MediaItem } from '@/lib/types';
import type { TmdbResult } from '@/lib/tmdb';
import type { TmdbMatch } from '@/app/api/tmdb/match/route';
import type { MusicTrack } from '@/lib/itunes';

/**
 * Looks up each saved item on TMDb (by title + year) so watchlist cards can show a
 * poster and open the same preview modal as the home page. Returns matches keyed by
 * media_items.id; an item with no TMDb match maps to null.
 */
export function useTmdbMatches(items: MediaItem[]): Record<string, TmdbMatch | null> {
  const [matches, setMatches] = useState<Record<string, TmdbMatch | null>>({});
  const signature = items.map((i) => i.id).join(',');

  // Items saved after migration 0007 carry their exact TMDb id + poster.
  const exact: Record<string, TmdbMatch> = {};
  for (const i of items) {
    if (i.tmdb_id && i.tmdb_media) {
      exact[i.id] = { tmdb_id: i.tmdb_id, media: i.tmdb_media, poster: i.cover_url ?? null, rating: 0 };
    }
  }

  useEffect(() => {
    // Songs are not on TMDb — a song title could match an unrelated movie poster.
    const missing = items.filter((i) => i.type !== 'music' && !(i.tmdb_id && i.tmdb_media) && !(i.id in matches));
    if (missing.length === 0) return;
    let cancelled = false;
    fetch('/api/tmdb/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: missing.map((i) => ({ key: i.id, title: i.title, year: i.year, type: i.type })),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { matches?: Record<string, TmdbMatch | null> } | null) => {
        if (!cancelled && data?.matches) setMatches((prev) => ({ ...prev, ...data.matches }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { ...matches, ...exact };
}

/** Build the TmdbResult the preview modal expects from a saved item + its TMDb match. */
export function savedItemToResult(item: MediaItem, match: TmdbMatch): TmdbResult {
  return {
    id: match.tmdb_id,
    title: item.title,
    year: item.year,
    poster: match.poster,
    rating: match.rating,
    // The details API reads "tv" as a series; everything else is a TMDb movie.
    type: match.media === 'tv' ? 'tv' : item.type === 'documentary' ? 'documentary' : 'movie',
    providers: [],
    has_th_providers: false,
    origin_country: null,
    provider_ids: [],
  };
}

/** Build the MusicModal track from a saved song (the 30s preview is looked up by iTunes id). */
export function savedItemToTrack(item: MediaItem): MusicTrack {
  return {
    trackId: item.itunes_track_id ?? 0,
    title: item.title,
    artist: item.artist ?? '',
    album: item.album ?? null,
    year: item.year,
    genre: item.genre,
    cover: item.cover_url ?? null,
    previewUrl: null,
    url: item.external_url ?? null,
  };
}
