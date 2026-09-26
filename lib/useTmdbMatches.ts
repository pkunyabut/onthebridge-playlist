'use client';

import { useEffect, useState } from 'react';
import type { MediaItem } from '@/lib/types';
import type { TmdbResult } from '@/lib/tmdb';
import type { TmdbMatch } from '@/app/api/tmdb/match/route';
import type { MusicTrack } from '@/lib/itunes';
import type { SeriesSchedule } from '@/app/api/tmdb/schedule/route';

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

/**
 * Air schedule (next / last episode) for saved series that aren't marked watched, fetched in
 * one request. Returns schedules keyed by TMDB id — used for the "📅 new episode" card badge.
 */
export function useSeriesSchedules(
  items: MediaItem[],
  matches: Record<string, TmdbMatch | null>,
): Record<number, SeriesSchedule | null> {
  const [schedules, setSchedules] = useState<Record<number, SeriesSchedule | null>>({});
  const ids = Array.from(
    new Set(
      items
        .filter((i) => i.status !== 'watched')
        .map((i) => matches[i.id])
        .filter((m): m is TmdbMatch => !!m && m.media === 'tv')
        .map((m) => m.tmdb_id),
    ),
  ).sort((a, b) => a - b);
  const signature = ids.join(',');

  useEffect(() => {
    const missing = ids.filter((id) => !(id in schedules));
    if (missing.length === 0) return;
    let cancelled = false;
    fetch('/api/tmdb/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: missing }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { schedules?: Record<number, SeriesSchedule | null> } | null) => {
        if (!cancelled && data?.schedules) setSchedules((prev) => ({ ...prev, ...data.schedules }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return schedules;
}
