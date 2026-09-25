'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { MUSIC_CHARTS, type MusicChartKey, type MusicTrack } from '@/lib/itunes';
import CardSkeleton from '@/components/CardSkeleton';
import Flag from '@/components/Flag';

interface MusicBrowserProps {
  isSaved: (track: MusicTrack) => boolean;
  onSelect: (track: MusicTrack) => void;
}

/** "เพลง" tab: Thai top songs from Apple Music, or search results from iTunes. */
export default function MusicBrowser({ isSaved, onSelect }: MusicBrowserProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [chart, setChart] = useState<MusicChartKey>('th');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(false);
    const url = activeQuery ? `/api/music?q=${encodeURIComponent(activeQuery)}` : `/api/music?kind=top&chart=${chart}`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { tracks?: MusicTrack[] }) => {
        if (requestId === requestRef.current) setTracks(data.tracks ?? []);
      })
      .catch(() => {
        if (requestId === requestRef.current) {
          setTracks([]);
          setError(true);
        }
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
  }, [activeQuery, chart]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(query.trim());
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('music_search_placeholder')}
          className="flex-1 min-w-0 px-4 py-3 min-h-[48px] rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-cinema-text-muted focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          className="px-5 py-3 min-h-[48px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold"
        >
          {t('music_search_button')}
        </button>
      </form>

      {!activeQuery && (
        <div className="chip-row scrollbar-hide mb-3">
          {MUSIC_CHARTS.map((c) => (
            <button
              key={c.key}
              onClick={() => setChart(c.key)}
              className={`chip ${chart === c.key ? 'active' : ''}`}
            >
              {c.key === 'us' ? c.flag : <Flag code={c.store} />} {t(`music_chart_${c.key}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-white">
          {activeQuery
            ? t('music_results_for', { q: activeQuery })
            : `🔥 ${t('music_top_title', { chart: t(`music_chart_${chart}`) })}`}
        </h3>
        {activeQuery ? (
          <button
            onClick={() => {
              setQuery('');
              setActiveQuery('');
            }}
            className="chip"
          >
            ✕ {t('music_clear_search')}
          </button>
        ) : (
          <span className="text-sm text-cinema-text-muted">{t('music_top_source')}</span>
        )}
      </div>

      {loading ? (
        <div className="imdb-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="text-base text-red-400 py-8 text-center">❌ {t('music_error')}</p>
      ) : tracks.length === 0 ? (
        <p className="text-base text-cinema-text-muted py-8 text-center">{t('music_no_results')}</p>
      ) : (
        <div className="imdb-grid">
          {tracks.map((track, index) => (
            <button
              key={track.trackId}
              type="button"
              onClick={() => onSelect(track)}
              className="imdb-card text-left"
            >
              <div className="relative aspect-square bg-cinema-800 overflow-hidden">
                {track.cover ? (
                  <img src={track.cover} alt={track.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">🎵</div>
                )}
                {!activeQuery && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-sm font-bold text-white">
                    #{index + 1}
                  </span>
                )}
                {isSaved(track) && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-green-600/90 text-sm font-bold text-white">✓</span>
                )}
                <span className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white" aria-hidden>
                  ▶
                </span>
              </div>
              <div className="card-info">
                <h3 className="card-title">{track.title}</h3>
                <p className="text-base text-cinema-text-muted line-clamp-1">{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
