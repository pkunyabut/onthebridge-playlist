'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, WatchStatus } from '@/lib/types';
import type { EpisodeInfo } from '@/app/api/tmdb/details/route';

export interface ProgressPatch {
  status?: WatchStatus;
  progress_season?: number | null;
  progress_episode?: number | null;
  notes?: string | null;
}

interface ProgressPanelProps {
  item: MediaItem;
  isSeries: boolean;
  /** number of seasons (TMDB) — the season picker only shows when > 1 */
  seasons: number | null;
  /** latest aired episode (TMDB) — for "N episodes not watched yet" */
  lastAired: EpisodeInfo | null;
  onChange: (patch: ProgressPatch) => Promise<void>;
}

const STATUSES: WatchStatus[] = ['want', 'watching', 'watched'];

/**
 * "My progress" inside the preview of a saved item: status (want / watching / watched),
 * the episode the user watched up to (series), and a personal note.
 */
export default function ProgressPanel({ item, isSeries, seasons, lastAired, onChange }: ProgressPanelProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<WatchStatus>(item.status ?? 'want');
  const [season, setSeason] = useState<number>(item.progress_season ?? 1);
  const [episode, setEpisode] = useState<number>(item.progress_episode ?? 0);
  const [notes, setNotes] = useState<string>(item.notes ?? '');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState(false);

  useEffect(() => {
    setStatus(item.status ?? 'want');
    setSeason(item.progress_season ?? 1);
    setEpisode(item.progress_episode ?? 0);
    setNotes(item.notes ?? '');
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // No progress saved yet → start at the latest aired season (The Voice: season 10, not 1).
  // TMDB details arrive after the panel mounts, so this runs when they do.
  useEffect(() => {
    if (item.progress_season == null && lastAired?.season) setSeason(lastAired.season);
  }, [item.progress_season, lastAired?.season]);

  const save = async (patch: ProgressPatch) => {
    setError(false);
    try {
      await onChange(patch);
    } catch {
      setError(true);
    }
  };

  const pickStatus = (next: WatchStatus) => {
    setStatus(next);
    save({ status: next });
  };

  const changeEpisode = (delta: number) => {
    const next = Math.max(0, episode + delta);
    setEpisode(next);
    // counting episodes means the user is watching it
    const nextStatus: WatchStatus = status === 'want' && next > 0 ? 'watching' : status;
    setStatus(nextStatus);
    save({ progress_season: season, progress_episode: next, status: nextStatus });
  };

  const changeSeason = (delta: number) => {
    const next = Math.min(Math.max(1, season + delta), Math.max(seasons ?? 1, 1));
    if (next === season) return;
    setSeason(next);
    setEpisode(0);
    save({ progress_season: next, progress_episode: 0 });
  };

  const saveNotes = async () => {
    setNotesState('saving');
    await save({ notes: notes.trim() || null });
    setNotesState('saved');
  };

  // aired-but-not-watched count (only when we compare within the same season)
  const unwatched =
    isSeries && lastAired && (lastAired.season === season || (seasons ?? 1) <= 1)
      ? Math.max(0, lastAired.episode - episode)
      : null;

  const stepBtn =
    'w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white text-2xl font-bold disabled:opacity-40';

  return (
    <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
      <p className="text-base font-semibold text-white mb-2">📝 {t('my_progress')}</p>

      <div className="grid grid-cols-3 gap-1.5 mb-3" role="group" aria-label={t('my_progress')}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pickStatus(s)}
            aria-pressed={status === s}
            className={`min-h-[44px] px-2 rounded-xl text-base font-medium transition-colors ${
              status === s ? 'bg-brand-600 text-white' : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/10'
            }`}
          >
            {t(`status_${s}`)}
          </button>
        ))}
      </div>

      {isSeries && (
        <div className="mb-3 space-y-2">
          {(seasons ?? 1) > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-base text-cinema-text-muted w-28">{t('progress_season_label')}</span>
              <button type="button" onClick={() => changeSeason(-1)} className={stepBtn} disabled={season <= 1} aria-label={t('progress_minus')}>−</button>
              <span className="min-w-[3ch] text-center text-lg font-bold text-white">{season}</span>
              <button type="button" onClick={() => changeSeason(1)} className={stepBtn} disabled={season >= (seasons ?? 1)} aria-label={t('progress_plus')}>+</button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-base text-cinema-text-muted w-28">{t('progress_episode_label')}</span>
            <button type="button" onClick={() => changeEpisode(-1)} className={stepBtn} disabled={episode <= 0} aria-label={t('progress_minus')}>−</button>
            <span className="min-w-[3ch] text-center text-lg font-bold text-white">{episode}</span>
            <button type="button" onClick={() => changeEpisode(1)} className={stepBtn} aria-label={t('progress_plus')}>+</button>
          </div>
          {lastAired && unwatched !== null && (
            <p className="text-base text-cinema-text-muted">
              {t('progress_latest', { ep: lastAired.episode })} ·{' '}
              <span className={unwatched > 0 ? 'text-brand-400 font-semibold' : 'text-green-400 font-semibold'}>
                {unwatched > 0 ? t('progress_unwatched', { n: unwatched }) : t('progress_caught_up')}
              </span>
            </p>
          )}
        </div>
      )}

      <label className="block text-base text-cinema-text-muted mb-1" htmlFor={`notes-${item.id}`}>
        {t('notes_label')}
      </label>
      <textarea
        id={`notes-${item.id}`}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setNotesState('idle');
        }}
        maxLength={2000}
        rows={2}
        placeholder={t('notes_placeholder')}
        className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-base placeholder:text-cinema-text-muted/70 focus:outline-none focus:border-brand-500"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={saveNotes}
          disabled={notesState === 'saving' || notes === (item.notes ?? '')}
          className="px-4 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white text-base font-medium disabled:opacity-40"
        >
          {t('notes_save')}
        </button>
        {notesState === 'saved' && !error && <span className="text-base text-green-400">{t('notes_saved')}</span>}
      </div>

      {error && <p className="mt-2 text-base text-red-400">{t('progress_error')}</p>}
    </div>
  );
}
