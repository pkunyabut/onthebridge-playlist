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

  // Lock body scroll while modal is open
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label={t('close')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Poster */}
        <div className="aspect-[2/3] bg-gray-100 dark:bg-slate-700 max-h-[400px]">
          {result.poster ? (
            <img
              src={result.poster}
              alt={result.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 dark:text-gray-600">
              {result.type === 'music' ? '🎵' : '🎬'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white pr-8">
            {result.title}
          </h2>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            {result.year && <span>{result.year}</span>}
            {result.year && result.rating > 0 && <span>·</span>}
            {result.rating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {result.rating.toFixed(1)}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-xs font-medium text-gray-600 dark:text-gray-300">
              {t(`type_${result.type}`)}
            </span>
          </div>

          {/* Artist (for music) */}
          {result.artist && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {result.artist}
            </p>
          )}

          {/* Providers */}
          {result.providers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.providers.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-xs font-medium text-gray-600 dark:text-gray-300"
                >
                  {platform}
                </span>
              ))}
            </div>
          )}

          {/* No TH providers notice */}
          {!result.has_th_providers && result.providers.length > 0 && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">
              {t('no_th_providers')}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-col gap-2">
            {/* Go to platform button */}
            {platformUrl && platformUrl !== '#' && (
              <button
                onClick={handleGoToPlatform}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-sm transition-colors min-h-[44px]"
              >
                <span>🔗</span>
                {t('go_to')} {primaryPlatform} {t('streaming_on')} ↗
              </button>
            )}

            {/* Add to playlist button */}
            <button
              onClick={handleAddToPlaylist}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-colors min-h-[44px] ${
                saved
                  ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                  : 'bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
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
