'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, PlatformType } from '@/lib/types';
import { PLATFORM_ICONS, PLATFORM_LABELS } from '@/lib/types';
import type { TmdbMatch } from '@/app/api/tmdb/match/route';
import type { SeriesSchedule } from '@/app/api/tmdb/schedule/route';
import StatusBadge from '@/components/StatusBadge';
import ScheduleBadge from '@/components/ScheduleBadge';

/** Bin icon for the card's delete action (Dashboard, รอดู). */
export function TrashIcon() {
  return (
    <svg className="w-4 h-4 text-white/60 hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬', series: '📺', documentary: '📹', talkshow: '🎤', music: '🎵', news: '📰',
};

interface SavedItemCardProps {
  item: MediaItem;
  match?: TmdbMatch | null;
  schedule?: SeriesSchedule | null;
  onOpen: () => void;
  /** title in the current ไทย | EN language (useLocalizedTitles) — falls back to the saved title */
  title?: string;
  /** top-right button, e.g. "remove from this collection" or delete */
  action?: { label: string; icon: React.ReactNode; onClick: () => void; busy?: boolean };
  /** line with the saved genre text (Dashboard, รอดู) */
  showGenre?: boolean;
  /** platform badge — off on รอดู, where cards are already grouped under a platform heading */
  showPlatform?: boolean;
}

/**
 * Card for a saved item (poster / album cover, status + new-episode badges, platform).
 * Used by Dashboard, รอดู and คอลเลกชัน — change the saved-item card here only.
 */
export default function SavedItemCard({
  item, match, schedule, onOpen, action, showGenre = false, showPlatform = true, title,
}: SavedItemCardProps) {
  const shownTitle = title ?? item.title;
  const { t } = useLanguage();
  const cover = item.type === 'music' ? item.cover_url : match?.poster ?? item.cover_url;
  const canOpen = item.type === 'music' || !!match;

  return (
    <div className={`imdb-card ${canOpen ? 'cursor-pointer' : '!cursor-default'}`} onClick={() => canOpen && onOpen()}>
      <div className="poster-container flex items-center justify-center bg-cinema-800">
        {cover ? (
          <img src={cover} alt={shownTitle} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{TYPE_ICONS[item.type] ?? '🎬'}</span>
        )}
        <div className="poster-overlay" />
        <StatusBadge item={item} />
        {match?.media === 'tv' && <ScheduleBadge item={item} schedule={schedule} />}
        {action && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            disabled={action.busy}
            className="save-btn"
            aria-label={action.label}
            title={action.label}
          >
            {action.busy ? (
              <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              action.icon
            )}
          </button>
        )}
      </div>
      <div className="card-info">
        <h3 className="card-title">{shownTitle}</h3>
        {item.type === 'music' && item.artist && (
          <p className="text-base text-cinema-text-muted line-clamp-1">{item.artist}</p>
        )}
        <div className="card-metadata">
          {item.year && <span className="year">{item.year}</span>}
          {item.year && <span className="text-white/20">·</span>}
          <span className="genre-tag">{t(`type_${item.type}`)}</span>
        </div>
        {showGenre && item.genre && (
          <p className="text-sm text-cinema-text-muted mt-0.5 line-clamp-1">{item.genre}</p>
        )}
        {showPlatform && item.platform && (
          <div className="mt-1.5">
            <span className="platform-badge">
              {PLATFORM_ICONS[item.platform as PlatformType]} {PLATFORM_LABELS[item.platform as PlatformType] ?? item.platform}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
