'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { TmdbRowItem } from '@/lib/tmdb';

interface SuggestionRowProps {
  title: string;
  icon?: string;
  items: TmdbRowItem[];
  loading?: boolean;
  onSelect: (item: TmdbRowItem) => void;
  /** Optional note shown under the heading (e.g. where the row came from). */
  hint?: string;
  emptyText?: string;
}

/**
 * Item 6 — a curated suggestion row: real TMDb posters in a horizontal scroll strip.
 * Cards are 132px wide (152px from 640px up) so two full cards fit a 360px phone.
 */
export default function SuggestionRow({
  title,
  icon,
  items,
  loading = false,
  onSelect,
  hint,
  emptyText,
}: SuggestionRowProps) {
  const { t } = useLanguage();

  if (!loading && items.length === 0) {
    return (
      <div className="mb-8">
        <div className="imdb-section-header">
          <h2>
            {icon ? `${icon} ` : ''}
            {title}
          </h2>
        </div>
        <p className="text-base text-cinema-text-muted">{emptyText ?? t('row_empty')}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="imdb-section-header">
        <h2>
          {icon ? `${icon} ` : ''}
          {title}
        </h2>
        {hint && <span className="count">{hint}</span>}
      </div>

      <div className="suggest-row scrollbar-hide">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="suggest-card">
                <div className="poster shimmer" />
                <div className="info">
                  <div className="h-4 w-4/5 rounded bg-white/10" />
                  <div className="h-3 w-2/5 mt-2 rounded bg-white/10" />
                </div>
              </div>
            ))
          : items.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                className="suggest-card text-left"
                onClick={() => onSelect(item)}
                aria-label={`${t('go_to')} ${item.title}`}
              >
                <div className="poster">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {item.type === 'music' ? '🎵' : '🎬'}
                    </div>
                  )}
                  {item.rating > 0 && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 text-sm font-bold">
                      <span className="text-imdb-yellow">★</span>
                      <span className="text-imdb-yellow">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="info">
                  <p className="title">{item.title}</p>
                  <p className="meta">
                    {item.year && <span>{item.year}</span>}
                    {item.year && <span className="text-white/20">·</span>}
                    <span>{t(`type_${item.type}`)}</span>
                  </p>
                </div>
              </button>
            ))}
      </div>
    </div>
  );
}