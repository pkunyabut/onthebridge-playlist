'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { PlatformType } from '@/lib/types';
import { PLATFORM_ICONS } from '@/lib/types';
import { PLATFORM_URLS, getCountryLabel, getCountryFlag } from '@/lib/tmdb';
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
    <div className="group relative bg-cinema-card rounded-xl overflow-hidden border border-cinema-border hover:border-brand-500/40 hover:shadow-gold-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-[2/3] bg-cinema-800">
        {result.poster ? (
          <img
            src={result.poster}
            alt={result.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {result.type === 'music' ? '🎵' : '🎬'}
          </div>
        )}

        {/* Country-of-origin badge */}
        {result.origin_country && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1 border border-white/10">
            <span>{getCountryFlag(result.origin_country)}</span>
            <span>{getCountryLabel(result.origin_country)}</span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleSave(result);
          }}
          disabled={saving}
          aria-label={saved ? t('remove_from_watchlist') : t('save_to_watchlist')}
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 disabled:opacity-50 transition-all duration-200 active:scale-90 hover:scale-110 hover:bg-black/80"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            <svg className="w-5 h-5 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.5L6 20V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white/70 group-hover:text-brand-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.5L6 20V4z" />
            </svg>
          )}
        </button>

        {result.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-medium border border-white/10">
            <span className="text-yellow-400">★</span>
            {result.rating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-cinema-text text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {result.title}
        </h3>
        {result.artist && (
          <p className="text-xs text-cinema-text-muted mt-0.5 line-clamp-1">
            {result.artist}
          </p>
        )}
        <p className="text-xs text-cinema-text-muted mt-1">
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
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cinema-700/80 text-[10px] font-medium text-cinema-text-muted border border-cinema-border"
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
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cinema-700/80 text-[10px] font-medium text-cinema-text-muted hover:bg-brand-500/20 hover:text-brand-400 hover:border-brand-500/30 border border-cinema-border transition-colors"
                >
                  {PLATFORM_ICONS[platform]} {platform} ↗
                </a>
              );
            })}
          </div>
        )}

        {!result.has_th_providers && result.providers.length > 0 && (
          <p className="text-[10px] text-cinema-text-muted/60 mt-1.5 italic">
            {t('no_th_providers')}
          </p>
        )}
      </div>
    </div>
  );
}
