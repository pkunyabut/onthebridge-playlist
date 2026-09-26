import type { EpisodeInfo } from '@/app/api/tmdb/details/route';

/**
 * Aired-but-not-watched episodes, counted across seasons.
 * Example: watched up to S7E3, latest aired S9E15, S7 has 12 episodes and S8 has 14
 *   → (12 − 3) + 14 + 15 = 38.
 * `seasonEpisodes` maps season number → episode count (TMDB `seasons[]`, specials excluded).
 * Returns null when it can't be worked out (no progress, or a season count is missing).
 */
export function countUnwatched(
  progressSeason: number | null | undefined,
  progressEpisode: number | null | undefined,
  lastAired: EpisodeInfo | null | undefined,
  seasonEpisodes: Record<number, number> | null | undefined,
): number | null {
  if (!lastAired || progressEpisode == null) return null;
  const season = progressSeason ?? lastAired.season;
  if (season === lastAired.season) return Math.max(0, lastAired.episode - progressEpisode);
  if (season > lastAired.season) return 0;

  const counts = seasonEpisodes ?? {};
  const current = counts[season];
  if (current == null) return null;
  let total = Math.max(0, current - progressEpisode);
  for (let s = season + 1; s < lastAired.season; s++) {
    if (counts[s] == null) return null;
    total += counts[s];
  }
  return total + lastAired.episode;
}

/** TMDB `seasons: [{ season_number, episode_count }]` → { 1: 12, 2: 14, … } (season 0 = specials, skipped) */
export function seasonEpisodeMap(seasons: { season_number?: number; episode_count?: number }[] | undefined): Record<number, number> {
  const map: Record<number, number> = {};
  for (const s of seasons ?? []) {
    if (s.season_number && s.season_number > 0 && typeof s.episode_count === 'number') {
      map[s.season_number] = s.episode_count;
    }
  }
  return map;
}
