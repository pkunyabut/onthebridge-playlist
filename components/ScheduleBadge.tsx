'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem } from '@/lib/types';
import type { SeriesSchedule } from '@/app/api/tmdb/schedule/route';
import { countUnwatched } from '@/lib/episodes';

/** viewer's local YYYY-MM-DD (toISOString() is UTC — before 07:00 in Thailand it's still yesterday) */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Top-left badge on a saved series card:
 *   🔔 "4 episodes not watched yet" — watching, and aired episodes are ahead of the progress
 *   📅 "new episode today" / "new episode Fri 2 Oct" — the next scheduled episode
 * Nothing for movies, finished shows, or items marked watched.
 */
export default function ScheduleBadge({ item, schedule }: { item: MediaItem; schedule?: SeriesSchedule | null }) {
  const { t, lang } = useLanguage();
  if (!schedule || item.status === 'watched') return null;

  const today = localToday();
  const last = schedule.last;
  let label: string | null = null;
  let tone = 'bg-sky-600/90';

  // aired but not watched (counted across seasons)
  if (item.status === 'watching' && last?.air_date && last.air_date <= today) {
    const behind = countUnwatched(item.progress_season, item.progress_episode, last, schedule.season_episodes) ?? 0;
    if (behind > 0) {
      label = `🔔 ${t('sched_unwatched', { n: behind })}`;
      tone = 'bg-red-600/90';
    }
  }

  const next = schedule.next;
  if (!label && next?.air_date && next.air_date >= today) {
    label =
      next.air_date === today
        ? `📅 ${t('sched_today')}`
        : `📅 ${t('sched_next', {
            date: new Date(`${next.air_date}T00:00:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            }),
          })}`;
  }

  if (!label) return null;
  return (
    <span className={`absolute top-2 left-2 z-10 max-w-[75%] px-2 py-1 rounded-md text-sm font-bold text-white ${tone}`}>
      {label}
    </span>
  );
}
