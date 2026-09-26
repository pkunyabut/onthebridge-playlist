'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, PlatformType } from '@/lib/types';
import { PLATFORM_ICONS, PLATFORM_LABELS } from '@/lib/types';
import type { TmdbMatch } from '@/app/api/tmdb/match/route';
import type { SeriesSchedule } from '@/app/api/tmdb/schedule/route';
import StatusBadge from '@/components/StatusBadge';
import ScheduleBadge from '@/components/ScheduleBadge';

const TYPE_ICONS: Record<string, string> = {
  movie: '🎬', series: '📺', documentary: '📹', talkshow: '🎤', music: '🎵', news: '📰',
};

interface SavedItemCardProps {
  item: MediaItem;
  match?: TmdbMatch | null;
  schedule?: SeriesSchedule | null;
  onOpen: () => void;
  /** top-right button, e.g. "remove from this collection" */
  action?: { label: string; icon: React.ReactNode; onClick: () => void; busy?: boolean };
}

/** Card for a saved item (poster / album cover, status + new-episode badges, platform). */
export default function SavedItemCard({ item, match, schedule, onOpen, action }: SavedItemCardProps) {
  const { t } = useLanguage();
  const cover = item.type === 'music' ? item.cover_url : match?.poster ?? item.cover_url;
  const canOpen = item.type === 'music' || !!match;

  return (
    <div className={`imdb-card ${canOpen ? 'cursor-pointer' : '!cursor-default'}`} onClick={() => canOpen && onOpen()}>
      <div className="poster-container flex items-center justify-center bg-cinema-800">
        {cover ? (
          <img src={cover} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
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
        <h3 className="card-title">{item.title}</h3>
        {item.type === 'music' && item.artist && (
          <p className="text-base text-cinema-text-muted line-clamp-1">{item.artist}</p>
        )}
        <div className="card-metadata">
          {item.year && <span className="year">{item.year}</span>}
          {item.year && <span className="text-white/20">·</span>}
          <span className="genre-tag">{t(`type_${item.type}`)}</span>
        </div>
        {item.platform && (
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
