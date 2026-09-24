'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import type { TmdbResult } from '@/lib/tmdb';
import { PLATFORM_URLS } from '@/lib/tmdb';

interface MediaModalProps {
  result: TmdbResult;
  isLoggedIn: boolean;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onToggleSave: (result: TmdbResult) => void;
}

export default function MediaModal({
  result,
  isLoggedIn,
  saved,
  saving,
  onClose,
  onToggleSave,
}: MediaModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const primaryPlatform = result.providers[0];
  const platformUrl = primaryPlatform ? PLATFORM_URLS[primaryPlatform] : null;

  const handleGoToPlatform = () => {
    if (platformUrl && platformUrl !== '#') {
      window.open(platformUrl, '_blank', 'noopener noreferrer');
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    if (!isLoggedIn) {
      router.push('/login');
      onClose();
      return;
    }
    onToggleSave(result);
  };

  return (
    <div className="imdb-modal-backdrop" onClick={onClose}>
      <div className="imdb-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label={t('close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Poster */}
        <div className="relative">
          {result.poster ? (
            <img
              src={result.poster}
              alt={result.title}
              className="modal-poster"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-cinema-800 flex items-center justify-center text-6xl">
              {result.type === 'music' ? '🎵' : '🎬'}
            </div>
          )}
          {/* Gradient overlay at bottom of poster */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-imdb-dark to-transparent" />
        </div>

        {/* Content */}
        <div className="modal-body">
          {/* Title */}
          <h2 className="modal-title">{result.title}</h2>

          {/* IMDb-style metadata row */}
          <div className="modal-meta">
            {result.year && <span>{result.year}</span>}
            {result.year && result.rating > 0 && <span className="text-white/20">·</span>}
            {result.rating > 0 && (
              <span className="imdb-rating">
                <span className="star">★</span>
                <span className="score">{result.rating.toFixed(1)}</span>
                <span className="text-cinema-text-muted font-normal">/10</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/5 text-cinema-text-muted border border-white/10">
              {t(`type_${result.type}`)}
            </span>
          </div>

          {/* Overview */}
          {result.overview && (
            <p className="modal-overview">{result.overview}</p>
          )}

          {/* Artist (for music) */}
          {result.artist && (
            <p className="text-sm text-cinema-text-muted mb-3">
              {result.artist}
            </p>
          )}

          {/* Providers */}
          {result.providers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-cinema-text-muted mb-2 font-medium">{t('watch_on')}:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.providers.map((platform) => (
                  <span
                    key={platform}
                    className="platform-badge"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* No TH providers notice */}
          {!result.has_th_providers && result.providers.length > 0 && (
            <p className="text-[11px] text-cinema-text-muted/60 italic mb-3">
              {t('no_th_providers')}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {platformUrl && platformUrl !== '#' && (
              <button
                onClick={handleGoToPlatform}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors min-h-[44px]"
              >
                <span>🔗</span>
                {t('go_to')} {primaryPlatform} {t('streaming_on')} ↗
              </button>
            )}
            <button
              onClick={handleAddToPlaylist}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors min-h-[44px] ${
                saved
                  ? 'bg-green-500/15 border-2 border-green-500/40 text-green-400'
                  : 'bg-white/5 border-2 border-white/10 text-cinema-text hover:bg-white/10'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.5L6 20V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              {saved ? t('already_in_watchlist') : t('add_to_watchlist')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
