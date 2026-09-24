'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, MediaType, PlatformType } from '@/lib/types';
import { PLATFORM_ICONS } from '@/lib/types';

type FilterType = 'all' | MediaType;

export default function WatchlistPage() {
  const { t } = useLanguage();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

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
            <div className="w-12 h-12 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cinema-text-muted">{t('loading')}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-20 md:pb-0">
        {/* Cinematic Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden glass border border-cinema-border animate-fade-up">
          <div className="absolute top-0 left-1/2 w-96 h-48 bg-brand-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gold-gradient mb-2">
              {t('watchlist_title')}
            </h1>
            <p className="text-cinema-text-muted text-sm">
              {t('total_items', { count: mediaItems.length })}
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_TABS.map((tab) => {
              const count = getCount(tab.key);
              const isActive = selectedFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-gold'
                      : 'glass text-cinema-text-muted hover:text-cinema-text border border-cinema-border'
                  }`}
                >
                  {tab.icon} {tab.label}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-brand-100' : 'text-cinema-text-muted/60'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-cinema-border animate-fade-up">
            <div className="text-7xl mb-6 animate-float">🎬</div>
            <h3 className="text-xl font-semibold text-cinema-text mb-3">
              {selectedFilter === 'all' ? t('watchlist_empty') : t('no_items_in_category')}
            </h3>
            <p className="text-cinema-text-muted mb-8 text-sm max-w-sm mx-auto">
              {selectedFilter === 'all'
                ? t('empty_hint')
                : t('change_category_hint')}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white rounded-xl font-medium text-sm transition-all shadow-gold hover:shadow-gold-lg active:scale-95"
            >
              <span>🔍</span>
              {t('go_search')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([platform, items]) => (
              <div key={platform} className="animate-fade-up">
                <h2 className="text-lg font-semibold text-cinema-text mb-3 flex items-center gap-2">
                  <span className="text-lg">{PLATFORM_ICONS[platform as PlatformType]}</span>
                  {platform}
                  <span className="text-sm font-normal text-cinema-text-muted">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 stagger-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="glass rounded-xl p-3 border border-cinema-border hover:border-brand-500/30 hover:shadow-gold transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm flex-shrink-0">{typeIcons[item.type]}</span>
                          <h3 className="font-semibold text-cinema-text text-sm leading-tight line-clamp-2">
                            {item.title}
                          </h3>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-cinema-text-muted hover:text-red-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10"
                          aria-label={t('delete')}
                        >
                          {deleting === item.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="space-y-1 text-xs text-cinema-text-muted">
                        <div className="flex items-center gap-1">
                          <span className="text-cinema-text-muted/60">{t('label_type')}</span>
                          <span className="font-medium text-cinema-text">{t(`type_${item.type}`)}</span>
                        </div>
                        {item.genre && (
                          <div className="flex items-center gap-1">
                            <span className="text-cinema-text-muted/60">{t('label_genre')}</span>
                            <span className="font-medium text-cinema-text">{item.genre}</span>
                          </div>
                        )}
                        {item.year && (
                          <div className="flex items-center gap-1">
                            <span className="text-cinema-text-muted/60">{t('label_year')}</span>
                            <span className="font-medium text-cinema-text">{item.year}</span>
                          </div>
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
    </AppShell>
  );
}
