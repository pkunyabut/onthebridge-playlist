'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { PlatformType } from '@/lib/types';
import { PLATFORM_ICONS } from '@/lib/types';
import { PLATFORM_URLS } from '@/lib/tmdb';
import type { TmdbResult } from '@/lib/tmdb';

interface MediaCardProps {
  result: TmdbResult;
  saved: boolean;
  saving: boolean;
  onToggleSave: (result: TmdbResult) => void;
}

export default function MediaCard({ result, saved, saving, onToggleSave }: MediaCardProps) {
  const { t } = useLanguage();

  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="relative aspect-[2/3] bg-gray-100 dark:bg-slate-700">
        {result.poster ? (
          <img
            src={result.poster}
            alt={result.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 dark:text-gray-600">
            {result.type === 'music' ? '🎵' : '🎬'}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleSave(result);
          }}
          disabled={saving}
          aria-label={saved ? t('remove_from_watchlist') : t('save_to_watchlist')}
          className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow-md backdrop-blur-sm disabled:opacity-50 transition-transform active:scale-95"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.5L6 20V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.5L6 20V4z" />
            </svg>
          )}
        </button>

        {result.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-medium">
            <span className="text-yellow-400">★</span>
            {result.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {result.title}
        </h3>
        {result.artist && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {result.artist}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {result.year ?? '—'}
        </p>

        {result.providers.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.providers.map((platform: PlatformType) => {
              const url = PLATFORM_URLS[platform];
              if (!url || url === '#') {
                return (
                  <span
                    key={platform}
                    title={t(`type_${result.type}`)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-[10px] font-medium text-gray-600 dark:text-gray-300"
                  >
                    {PLATFORM_ICONS[platform]} {t(`type_${result.type}`)}
                  </span>
                );
              }
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${t('watch_on')} ${platform}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {PLATFORM_ICONS[platform]} {platform} ↗
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
