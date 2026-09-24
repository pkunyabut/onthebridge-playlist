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

  const FILTER_TABS: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'movie', label: t('type_movie') },
    { key: 'series', label: t('type_series') },
    { key: 'documentary', label: t('type_documentary') },
    { key: 'talkshow', label: t('type_talkshow') },
    { key: 'music', label: t('type_music') },
    { key: 'news', label: t('type_news') },
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

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-20 md:pb-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('watchlist_title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('total_items', { count: mediaItems.length })}
          </p>
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
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-500'
                    }
                  `}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-brand-100' : 'text-gray-400 dark:text-gray-500'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {selectedFilter === 'all' ? t('watchlist_empty') : t('no_items_in_category')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              {selectedFilter === 'all'
                ? t('empty_hint')
                : t('change_category_hint')}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <span>🔍</span>
              {t('go_search')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([platform, items]) => (
              <div key={platform}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>{PLATFORM_ICONS[platform as PlatformType]}</span>
                  {platform}
                  <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
                          {item.title}
                        </h3>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label={t('delete')}
                        >
                          {deleting === item.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 dark:text-gray-500">{t('label_type')}</span>
                          <span className="font-medium">{t(`type_${item.type}`)}</span>
                        </div>
                        {item.genre && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 dark:text-gray-500">{t('label_genre')}</span>
                            <span className="font-medium">{item.genre}</span>
                          </div>
                        )}
                        {item.year && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 dark:text-gray-500">{t('label_year')}</span>
                            <span className="font-medium">{item.year}</span>
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
