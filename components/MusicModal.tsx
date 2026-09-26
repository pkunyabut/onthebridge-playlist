'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import type { MusicTrack } from '@/lib/itunes';
import CollectionPicker from '@/components/CollectionPicker';

interface MusicModalProps {
  track: MusicTrack;
  isLoggedIn: boolean;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onToggleSave: (track: MusicTrack) => void;
  /** media_items id when the song is already saved — shows the collections box */
  savedItemId?: string;
}

/** Song preview: cover, details, a 30-second preview clip and a link to Apple Music. */
export default function MusicModal({ track, isLoggedIn, saved, saving, onClose, onToggleSave, savedItemId }: MusicModalProps) {
  const router = useRouter();
  const { t, lang } = useLanguage();

  // Saved songs only store the iTunes id — fetch a fresh preview link when it's missing.
  const [previewUrl, setPreviewUrl] = useState<string | null>(track.previewUrl);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setPreviewUrl(track.previewUrl);
    if (track.previewUrl || !track.trackId) return;
    let cancelled = false;
    setPreviewLoading(true);
    fetch(`/api/music?ids=${track.trackId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tracks?: MusicTrack[] } | null) => {
        if (!cancelled) setPreviewUrl(data?.tracks?.[0]?.previewUrl ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [track.trackId, track.previewUrl]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = () => {
    if (!isLoggedIn) {
      router.push('/login');
      onClose();
      return;
    }
    onToggleSave(track);
  };

  return (
    <div className="imdb-modal-backdrop" onClick={onClose}>
      <div className="imdb-modal" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label={t('close')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {track.cover ? (
          <img src={track.cover} alt={track.title} className="w-full aspect-square object-cover rounded-t-xl" />
        ) : (
          <div className="w-full aspect-square bg-cinema-800 flex items-center justify-center text-6xl rounded-t-xl">🎵</div>
        )}

        <div className="modal-body">
          <h2 className="modal-title">{track.title}</h2>
          {track.artist && <p className="text-lg text-white/90 mb-2">{track.artist}</p>}
          <p className="text-base text-cinema-text-muted mb-4">
            {[track.album, track.year, track.genre].filter(Boolean).join(' · ')}
          </p>

          {/* 30-second preview only */}
          <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-base font-medium text-white mb-2">🎧 {t('music_preview_label')}</p>
            {previewUrl ? (
              <audio controls preload="none" src={previewUrl} className="w-full">
                {t('music_no_preview')}
              </audio>
            ) : previewLoading ? (
              <div className="h-10 rounded bg-white/10 animate-pulse" aria-label={t('loading')} />
            ) : (
              <p className="text-base text-cinema-text-muted">{t('music_no_preview')}</p>
            )}
            <p className="mt-2 text-sm text-cinema-text-muted/80">{t('music_preview_courtesy')}</p>
          </div>

          {savedItemId && <CollectionPicker mediaItemId={savedItemId} />}

          <div className="flex flex-col gap-2">
            {/* Apple requires previews to sit next to its official store badge */}
            {track.url && (
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-center"
                aria-label={t('music_open_apple')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://toolbox.marketingtools.apple.com/api/badges/listen-on-apple-music/badge/${lang === 'th' ? 'th-th' : 'en-us'}?size=250x83`}
                  alt={t('music_open_apple')}
                  className="h-12 w-auto"
                />
              </a>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-base transition-colors min-h-[48px] ${
                saved
                  ? 'bg-green-500/15 border-2 border-green-500/40 text-green-400'
                  : 'bg-white/5 border-2 border-white/10 text-cinema-text hover:bg-white/10'
              } disabled:opacity-50`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
              ) : saved ? '✓ ' + t('already_in_watchlist') : '+ ' + t('add_to_watchlist')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
