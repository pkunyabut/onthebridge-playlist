'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import type { TmdbResult } from '@/lib/tmdb';
import { PLATFORM_URLS } from '@/lib/tmdb';
import type { TmdbDetails } from '@/app/api/tmdb/details/route';
import { networkForTmdbId } from '@/lib/networks';
import type { MediaItem } from '@/lib/types';
import ProgressPanel, { type ProgressPatch } from '@/components/ProgressPanel';
import CollectionPicker from '@/components/CollectionPicker';

interface MediaModalProps {
  result: TmdbResult;
  isLoggedIn: boolean;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onToggleSave: (result: TmdbResult) => void;
  /** Saved item (dashboard / watchlist): shows "My progress" — status, episode, note. */
  savedItem?: MediaItem;
  onUpdateSaved?: (patch: ProgressPatch) => Promise<void>;
}

export default function MediaModal({
  result,
  isLoggedIn,
  saved,
  saving,
  onClose,
  onToggleSave,
  savedItem,
  onUpdateSaved,
}: MediaModalProps) {
  const router = useRouter();
  const { t, lang } = useLanguage();

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

  // Extra preview info (synopsis, trailer, cast, where to watch) fetched from TMDb.
  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    setDetails(null);
    setShowTrailer(false);
    if (!/^\d+$/.test(String(result.id))) return;
    let cancelled = false;
    setDetailsLoading(true);
    fetch(`/api/tmdb/details?type=${result.type}&id=${result.id}&language=${lang === 'en' ? 'en-US' : 'th-TH'}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TmdbDetails | null) => { if (!cancelled) setDetails(data); })
      .catch(() => { if (!cancelled) setDetails(null); })
      .finally(() => { if (!cancelled) setDetailsLoading(false); });
    return () => { cancelled = true; };
  }, [result.id, result.type, lang]);

  const overview = details?.overview ?? result.overview ?? null;
  const streamProviders = details?.providers.stream ?? [];
  const rentBuyProviders = details ? [...details.providers.rent, ...details.providers.buy] : [];

  const lengthLabel = (() => {
    if (!details) return null;
    if (details.seasons) {
      return `${details.seasons} ${t('seasons_unit')}${details.episodes ? ` · ${details.episodes} ${t('episodes_unit')}` : ''}`;
    }
    if (details.runtime) {
      const h = Math.floor(details.runtime / 60);
      const m = details.runtime % 60;
      return h > 0 ? `${h} ${t('hours_unit')} ${m} ${t('minutes_unit')}` : `${m} ${t('minutes_unit')}`;
    }
    return null;
  })();

  // Series schedule: "next episode airs …" — JustWatch has no schedule for Thai channels.
  const formatAirDate = (isoDate: string) =>
    new Date(`${isoDate}T00:00:00`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  // viewer's local date (toISOString() is UTC — before 07:00 in Thailand it would still be yesterday)
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const episodeLabel = (e: { season: number; episode: number }) =>
    details && (details.seasons ?? 1) > 1
      ? t('episode_label_season', { s: e.season, ep: e.episode })
      : t('episode_label', { ep: e.episode });
  const schedule = (() => {
    if (!details || result.type !== 'tv') return null;
    const next = details.next_episode;
    if (next?.air_date && next.air_date >= todayIso) {
      const when = next.air_date === todayIso ? t('airs_today') : formatAirDate(next.air_date);
      return { icon: '📅', label: t('next_ep_label'), value: `${episodeLabel(next)} · ${when}`, highlight: true };
    }
    if (details.status === 'Ended' || details.status === 'Canceled') {
      return {
        icon: '✅',
        label: t('ended_label'),
        value: details.episodes ? t('episodes_total', { n: details.episodes }) : '',
        highlight: false,
      };
    }
    const last = details.last_episode;
    if (last?.air_date) {
      return { icon: '🕘', label: t('last_ep_label'), value: `${episodeLabel(last)} · ${formatAirDate(last.air_date)}`, highlight: false };
    }
    return null;
  })();

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

        {/* Trailer (replaces the poster while playing) */}
        {showTrailer && details?.trailer ? (
          <div className="relative w-full aspect-video bg-black rounded-t-xl overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${details.trailer.key}?autoplay=1&rel=0&playsinline=1`}
              title={details.trailer.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ) : (
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
        )}

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
            <span className="px-2 py-0.5 rounded text-sm font-medium bg-white/5 text-cinema-text-muted border border-white/10">
              {t(`type_${result.type}`)}
            </span>
          </div>

          {/* Length + genres */}
          {(lengthLabel || (details && details.genres.length > 0)) && (
            <p className="text-base text-cinema-text-muted mb-3">
              {[lengthLabel, details?.genres.slice(0, 3).join(' · ')].filter(Boolean).join('  |  ')}
            </p>
          )}

          {/* Episode schedule (series) */}
          {schedule && (
            <div
              className={`mb-4 p-3 rounded-xl border text-base ${
                schedule.highlight ? 'bg-brand-600/15 border-brand-500/40' : 'bg-white/5 border-white/10'
              }`}
            >
              <p className="font-semibold text-white">
                {schedule.icon} {schedule.label}
              </p>
              {schedule.value && <p className="text-white/90 mt-0.5">{schedule.value}</p>}
              {schedule.icon !== '✅' && <p className="text-sm text-cinema-text-muted/80 mt-1">{t('schedule_note')}</p>}
            </div>
          )}

          {/* My progress (saved items only) */}
          {savedItem && onUpdateSaved && (
            <ProgressPanel
              item={savedItem}
              isSeries={result.type === 'tv'}
              seasons={details?.seasons ?? null}
              lastAired={details?.last_episode ?? null}
              onChange={onUpdateSaved}
            />
          )}
          {savedItem && <CollectionPicker mediaItemId={savedItem.id} />}

          {/* Trailer button */}
          {details?.trailer && (
            <button
              onClick={() => setShowTrailer((v) => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl font-semibold text-base min-h-[48px] bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              {showTrailer ? `✕ ${t('close_trailer')}` : `▶ ${t('watch_trailer')}`}
            </button>
          )}

          {/* Loading placeholder while details are fetched */}
          {detailsLoading && !details && (
            <div className="space-y-2 mb-4 animate-pulse" aria-label={t('loading')}>
              <div className="h-4 rounded bg-white/10 w-full" />
              <div className="h-4 rounded bg-white/10 w-11/12" />
              <div className="h-4 rounded bg-white/10 w-3/4" />
            </div>
          )}

          {/* Overview */}
          {overview && (
            <>
              {details?.overview_is_english && (
                <p className="text-sm text-cinema-text-muted/70 mb-1">{t('overview_english_only')}</p>
              )}
              <p className="modal-overview">{overview}</p>
            </>
          )}
          {details && !overview && (
            <p className="modal-overview italic">{t('no_overview')}</p>
          )}

          {/* Director / cast */}
          {details && (details.directors.length > 0 || details.cast.length > 0) && (
            <div className="mb-4 space-y-1 text-base">
              {details.directors.length > 0 && (
                <p>
                  <span className="text-cinema-text-muted">{result.type === 'tv' ? t('created_by') : t('director')}: </span>
                  <span className="text-white">{details.directors.join(', ')}</span>
                </p>
              )}
              {details.cast.length > 0 && (
                <p>
                  <span className="text-cinema-text-muted">{t('cast')}: </span>
                  <span className="text-white">{details.cast.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Where to watch in Thailand (real TMDb data) */}
          {details && (
            <div className="mb-4">
              <p className="text-base text-cinema-text-muted mb-2 font-medium">{t('where_to_watch_th')}</p>
              {streamProviders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {streamProviders.map((p) => (
                    <span key={p.provider_id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-base">
                      {p.logo && <img src={p.logo} alt="" className="w-6 h-6 rounded" />}
                      {p.provider_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-base text-cinema-text-muted/80">
                  {(details.networks ?? []).length > 0 ? t('no_streaming_th_see_network') : t('no_streaming_th')}
                </p>
              )}
              {rentBuyProviders.length > 0 && (
                <p className="text-sm text-cinema-text-muted mt-2">
                  {t('rent_or_buy')}: {rentBuyProviders.map((p) => p.provider_name).join(', ')}
                </p>
              )}
              <p className="mt-2 text-sm text-cinema-text-muted/80">{t('justwatch_credit')}</p>

              {/* Channel/platform it aired on — fills the gap for Thai channels & Asian platforms */}
              {(details.networks ?? []).length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-base text-cinema-text-muted mb-2 font-medium">📺 {t('aired_on_label')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(details.networks ?? []).map((n) => (
                      <span key={n.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white text-gray-900 text-base font-medium">
                        {n.logo && <img src={n.logo} alt="" className="h-5 w-auto max-w-[64px] object-contain" />}
                        {(() => {
                          const known = networkForTmdbId(n.id);
                          return known ? t(`network_${known.key}`) : n.name;
                        })()}
                      </span>
                    ))}
                  </div>
                  {(details.networks ?? [])
                    .map((n) => networkForTmdbId(n.id))
                    .filter((net, i, arr): net is NonNullable<typeof net> => !!net && arr.findIndex((x) => x?.key === net.key) === i)
                    .map((net) => (
                      <a
                        key={net.key}
                        href={net.app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-medium transition-colors"
                      >
                        {t('network_go_app', { app: net.app.name })} ↗
                      </a>
                    ))}
                  <p className="mt-2 text-sm text-cinema-text-muted/80">{t('aired_on_note')}</p>
                </div>
              )}
              {details.watch_link && (streamProviders.length > 0 || rentBuyProviders.length > 0) && (
                <a
                  href={details.watch_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-base text-brand-400 underline underline-offset-2"
                >
                  {t('see_watch_links')} ↗
                </a>
              )}
            </div>
          )}

          {/* Artist (for music) */}
          {result.artist && (
            <p className="text-sm text-cinema-text-muted mb-3">
              {result.artist}
            </p>
          )}

          {/* Providers from the list data — hidden once the real TH data above has loaded */}
          {!details && result.providers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-cinema-text-muted mb-2 font-medium">{t('watch_on')}:</p>
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
          {!details && !result.has_th_providers && result.providers.length > 0 && (
            <p className="text-sm text-cinema-text-muted/60 italic mb-3">
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
