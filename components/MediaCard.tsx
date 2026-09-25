'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { PlatformType } from '@/lib/types';
import { PLATFORM_ICONS } from '@/lib/types';
import { PLATFORM_URLS, getCountryLabel, getCountryFlag } from '@/lib/tmdb';
import type { TmdbResult } from '@/lib/tmdb';

/**
 * Get optimized image URL based on display width.
 */
function getOptimizedImageUrl(posterUrl: string | null, displayWidth: number = 200): string | undefined {
  if (!posterUrl) return undefined;
  const size = displayWidth > 300 ? 'w500' : 'w342';
  const pathMatch = posterUrl.match(/\/t\/p\/w\d+(\/[^/]+)$/);
  const posterPath = pathMatch ? pathMatch[1] : posterUrl;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

interface MediaCardProps {
  result: TmdbResult;
  saved: boolean;
  saving: boolean;
  onToggleSave: (result: TmdbResult) => void;
  /** True when the title is on one of the services the user selected (item 4). */
  onMyService?: boolean;
}

export default function MediaCard({ result, saved, saving, onToggleSave, onMyService = false }: MediaCardProps) {
  const { t } = useLanguage();

  return (
    <div className={`imdb-card group ${onMyService ? 'on-my-service' : ''}`}>
      {/* Poster */}
      <div className="poster-container">
        {result.poster ? (
          <img
            src={getOptimizedImageUrl(result.poster) ?? result.poster}
            alt={result.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-cinema-800">
            {result.type === 'music' ? '🎵' : '🎬'}
          </div>
        )}

        {/* Hover overlay */}
        <div className="poster-overlay" />

        {/* Country badge */}
        {result.origin_country && (
          <div className="country-badge">
            <span>{getCountryFlag(result.origin_country)}</span>
            <span>{t(`country_${result.origin_country}`) === `country_${result.origin_country}` ? getCountryLabel(result.origin_country) : t(`country_${result.origin_country}`)}</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleSave(result);
          }}
          disabled={saving}
          aria-label={saved ? t('remove_from_watchlist') : t('save_to_watchlist')}
          className={`save-btn ${saved ? 'saved' : ''}`}
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

        {/* IMDb-style rating badge */}
        {result.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-sm font-bold border border-white/10">
            <span className="text-imdb-yellow">★</span>
            <span className="text-imdb-yellow">{result.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Item 4 — available on the user's own services */}
        {onMyService && (
          <div className="my-service-badge">
            <span>✓</span>
            <span>{t('on_my_services')}</span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="card-info">
        <h3 className="card-title">{result.title}</h3>

        {/* Metadata row */}
        <div className="card-metadata">
          {result.year && <span className="year">{result.year}</span>}
          {result.year && <span className="text-white/20">·</span>}
          <span className="genre-tag">{t(`type_${result.type}`)}</span>
        </div>

        {/* Artist for music */}
        {result.artist && (
          <p className="text-sm text-cinema-text-muted mt-1 line-clamp-1">
            {result.artist}
          </p>
        )}

        {/* Platform badges */}
        {result.providers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.providers.slice(0, 3).map((platform: PlatformType) => {
              const url = PLATFORM_URLS[platform];
              if (!url || url === '#') {
                return (
                  <span key={platform} className="platform-badge">
                    {PLATFORM_ICONS[platform]} {platform}
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
                  className="platform-badge link"
                >
                  {PLATFORM_ICONS[platform]} {platform} ↗
                </a>
              );
            })}
          </div>
        )}

        {!result.has_th_providers && result.providers.length > 0 && (
          <p className="text-sm text-cinema-text-muted/70 mt-1 italic">
            {t('no_th_providers')}
          </p>
        )}
      </div>
    </div>
  );
}