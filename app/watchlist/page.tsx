'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, MediaType, PlatformType } from '@/lib/types';
import { PLATFORM_ICONS } from '@/lib/types';
import MediaModal from '@/components/MediaModal';
import { useTmdbMatches, savedItemToResult } from '@/lib/useTmdbMatches';
import type { TmdbResult } from '@/lib/tmdb';

type FilterType = 'all' | MediaType;

export default function WatchlistPage() {
  const { t } = useLanguage();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Poster + preview for saved items
  const matches = useTmdbMatches(mediaItems);
  const [preview, setPreview] = useState<TmdbResult | null>(null);

  const FILTER_TABS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: t('filter_all'), icon: '🎯' },
    { key: 'movie', label: t('type_movie'), icon: '🎬' },
    { key: 'series', label: t('type_series'), icon: '📺' },
    { key: 'documentary', label: t('type_documentary'), icon: '📹' },
    { key: 'talkshow', label: t('type_talkshow'), icon: '🎤' },
    { key: 'music', label: t('type_music'), icon: '🎵' },
    { key: 'news', label: t('type_news'), icon: '📰' },
  ];

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/media');
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media || []);
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMediaItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(null);
    }
  };

  const filteredItems = selectedFilter === 'all'
    ? mediaItems
    : mediaItems.filter((item) => item.type === selectedFilter);

  const groupedItems = filteredItems.reduce<Record<string, MediaItem[]>>((acc, item) => {
    const platform = item.platform;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(item);
    return acc;
  }, {});

  const getCount = (filter: FilterType): number => {
    if (filter === 'all') return mediaItems.length;
    return mediaItems.filter((item) => item.type === filter).length;
  };

  const typeIcons: Record<string, string> = {
    movie: '🎬',
    series: '📺',
    documentary: '📹',
    talkshow: '🎤',
    music: '🎵',
    news: '📰',
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cinema-text-muted">{t('loading')}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-20 md:pb-0">
        {/* Header — IMDb style */}
        <div className="relative mb-6 p-5 md:p-7 rounded-xl overflow-hidden glass border border-cinema-border animate-fade-up">
          <div className="absolute top-0 left-1/2 w-72 h-40 bg-brand-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 text-center">
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              {t('watchlist_title')}
            </h1>
            <p className="text-cinema-text-muted text-sm">
              {t('total_items', { count: mediaItems.length })}
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-5">
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_TABS.map((tab) => {
              const count = getCount(tab.key);
              const isActive = selectedFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {tab.icon} {tab.label}
                  <span className={`ml-1 text-sm ${isActive ? 'text-brand-100' : 'text-cinema-text-muted/60'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 glass rounded-xl border border-cinema-border animate-fade-up">
            <div className="text-6xl mb-6 animate-float">🎬</div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {selectedFilter === 'all' ? t('watchlist_empty') : t('no_items_in_category')}
            </h3>
            <p className="text-cinema-text-muted mb-8 text-sm max-w-sm mx-auto">
              {selectedFilter === 'all'
                ? t('empty_hint')
                : t('change_category_hint')}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-gold"
            >
              <span>🔍</span>
              {t('go_search')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([platform, items]) => (
              <div key={platform} className="animate-fade-up">
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-base">{PLATFORM_ICONS[platform as PlatformType]}</span>
                  {platform}
                  <span className="text-sm font-normal text-cinema-text-muted">
                    ({items.length})
                  </span>
                </h2>
                <div className="imdb-grid stagger-grid">
                  {items.map((item) => (
                    <div key={item.id} className={`imdb-card ${matches[item.id] ? 'cursor-pointer' : '!cursor-default'}`}
                      onClick={() => {
                        const match = matches[item.id];
                        if (match) setPreview(savedItemToResult(item, match));
                      }}>
                      <div className="poster-container flex items-center justify-center bg-cinema-800">
                        {matches[item.id]?.poster ? (
                          <img
                            src={matches[item.id]!.poster!}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">{typeIcons[item.type]}</span>
                        )}
                        <div className="poster-overlay" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          disabled={deleting === item.id}
                          className="save-btn"
                          aria-label={t('delete')}
                        >
                          {deleting === item.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4 text-white/60 hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="card-info">
                        <h3 className="card-title">{item.title}</h3>
                        <div className="card-metadata">
                          {item.year && <span className="year">{item.year}</span>}
                          {item.year && <span className="text-white/20">·</span>}
                          <span className="genre-tag">{t(`type_${item.type}`)}</span>
                        </div>
                        {item.genre && (
                          <p className="text-sm text-cinema-text-muted mt-0.5 line-clamp-1">{item.genre}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview of a saved item (poster/details looked up on TMDb by title + year) */}
      {preview && (
        <MediaModal
          result={preview}
          isLoggedIn
          saved
          saving={false}
          onClose={() => setPreview(null)}
          onToggleSave={() => setPreview(null)}
        />
      )}
    </AppShell>
  );
}
