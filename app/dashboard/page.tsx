'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import type { MediaItem } from '@/lib/types';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import type { PlatformType } from '@/lib/types';
import { PLATFORM_ICONS, PLATFORM_LABELS } from '@/lib/types';
import MediaModal from '@/components/MediaModal';
import StatusBadge from '@/components/StatusBadge';
import type { ProgressPatch } from '@/components/ProgressPanel';
import MusicModal from '@/components/MusicModal';
import { useTmdbMatches, useSeriesSchedules, savedItemToResult, savedItemToTrack } from '@/lib/useTmdbMatches';
import ScheduleBadge from '@/components/ScheduleBadge';
import type { MusicTrack } from '@/lib/itunes';
import type { TmdbResult } from '@/lib/tmdb';

interface Recommendation {
  title: string;
  type: string;
  reason: string;
  suggestedPlatform?: string;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // AI Recommendations state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Poster + preview for saved items
  const matches = useTmdbMatches(mediaItems);
  const schedules = useSeriesSchedules(mediaItems, matches);
  const [preview, setPreview] = useState<TmdbResult | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const previewItem = mediaItems.find((m) => m.id === previewItemId);

  // status / episode / note from the preview's "My progress" panel
  const updateSaved = async (id: string, patch: ProgressPatch) => {
    const res = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.media) throw new Error(data.error || 'update failed');
    setMediaItems((items) => items.map((m) => (m.id === id ? { ...m, ...data.media } : m)));
  };
  const [song, setSong] = useState<MusicTrack | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      // /api/media reads the login cookie itself — the plain browser client can't see that session.
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
    if (!confirm(t('confirm_delete_item'))) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' });

      if (res.ok) {
        setMediaItems(mediaItems.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(null);
    }
  };

  const fetchAiRecommendations = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRecommendations(null);
    setShowAiModal(true);

    if (mediaItems.length === 0) {
      setAiLoading(false);
      setAiError(t('ai_empty_hint'));
      return;
    }

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'API error');
      }

      const data = await res.json();
      setAiRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('AI recommendation error:', error);
      setAiError(error instanceof Error ? error.message : t('ai_error'));
    } finally {
      setAiLoading(false);
    }
  };

  const typeIcons: Record<string, string> = {
    movie: '🎬',
    series: '📺',
    documentary: '📹',
    talkshow: '🎤',
    music: '🎵',
    news: '📰',
  };

  const typeLabels: Record<string, string> = {
    movie: t('type_movie'),
    series: t('type_series'),
    documentary: t('type_documentary'),
    talkshow: t('type_talkshow'),
    music: t('type_music'),
    news: t('type_news'),
  };

  const aiTypeLabels: Record<string, string> = {
    movie: t('ai_type_movie'),
    series: t('ai_type_series'),
    documentary: t('ai_type_documentary'),
    music: t('ai_type_music'),
  };

  const aiPlatformIcons: Record<string, string> = PLATFORM_ICONS;

  // Stats by type
  const statsByType = mediaItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  // Recent items (last 12)
  const recentItems = [...mediaItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);

  const filteredItems = filter === 'all'
    ? recentItems
    : recentItems.filter((item) => item.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cinema-text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero Section — IMDb style */}
      <div className="relative mb-6 p-5 md:p-7 rounded-xl overflow-hidden glass border border-cinema-border animate-fade-up">
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-brand-600/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
            {t('my_items')}
          </h1>
          <p className="text-cinema-text-muted text-sm mb-4">
            {t('total_items', { count: mediaItems.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/add"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-gold"
            >
              <span>➕</span>
              {t('add_item')}
            </Link>
            <button
              onClick={fetchAiRecommendations}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {aiLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>✨</span>
              )}
              {t('ai_recommend')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6 stagger-grid">
          {Object.entries(typeLabels).map(([type, label]) => {
            const count = statsByType[type] || 0;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? 'all' : type)}
                className={`p-3 rounded-lg glass border transition-all duration-200 text-left ${
                  filter === type ? 'border-brand-500/50 shadow-glow' : 'border-cinema-border hover:border-white/10'
                }`}
              >
                <div className="text-xl mb-1">{typeIcons[type]}</div>
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-sm text-cinema-text-muted">{label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-brand-600 text-white'
              : 'glass text-cinema-text-muted hover:text-white border border-cinema-border'
          }`}
        >
          {t('filter_all')}
        </button>
        {Object.entries(typeLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === type
                ? 'bg-brand-600 text-white'
                : 'glass text-cinema-text-muted hover:text-white border border-cinema-border'
            }`}
          >
            {typeIcons[type]} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mediaItems.length === 0 ? (
        <div className="text-center py-16 glass rounded-xl border border-cinema-border animate-fade-up">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {t('no_items_title')}
          </h3>
          <p className="text-cinema-text-muted mb-6 text-sm">
            {t('no_items_hint')}
          </p>
          <Link
            href="/dashboard/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-gold"
          >
            <span>➕</span>
            {t('add_first_item')}
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl border border-cinema-border">
          <div className="text-3xl mb-3">{typeIcons[filter]}</div>
          <p className="text-cinema-text-muted text-sm">{t('no_items_in_category')}</p>
        </div>
      ) : (
        <div className="imdb-grid stagger-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`imdb-card ${matches[item.id] || item.type === 'music' ? 'cursor-pointer' : '!cursor-default'}`}
              onClick={() => {
                if (item.type === 'music') {
                  setSong(savedItemToTrack(item));
                  return;
                }
                const match = matches[item.id];
                if (match) {
                  setPreview(savedItemToResult(item, match));
                  setPreviewItemId(item.id);
                }
              }}
            >
              {/* Poster placeholder for saved items */}
              <div className="poster-container flex items-center justify-center bg-cinema-800">
                {(item.type === 'music' ? item.cover_url : matches[item.id]?.poster) ? (
                  <img
                    src={(item.type === 'music' ? item.cover_url : matches[item.id]?.poster)!}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{typeIcons[item.type]}</span>
                )}
                <div className="poster-overlay" />
                <StatusBadge item={item} />
                {matches[item.id]?.media === 'tv' && (
                  <ScheduleBadge item={item} schedule={schedules[matches[item.id]!.tmdb_id]} />
                )}
                {/* Delete button */}
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
                {item.type === 'music' && item.artist && (
                  <p className="text-base text-cinema-text-muted line-clamp-1">{item.artist}</p>
                )}
                <div className="card-metadata">
                  {item.year && <span className="year">{item.year}</span>}
                  {item.year && <span className="text-white/20">·</span>}
                  <span className="genre-tag">{typeLabels[item.type] || item.type}</span>
                </div>
                {item.genre && (
                  <p className="text-sm text-cinema-text-muted mt-0.5 line-clamp-1">{item.genre}</p>
                )}
                {item.platform && (
                  <div className="mt-1.5">
                    <span className="platform-badge">
                      {PLATFORM_ICONS[item.platform as PlatformType]} {PLATFORM_LABELS[item.platform as PlatformType] ?? item.platform}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Song preview for saved music (30-second clip) */}
      {song && (
        <MusicModal
          track={song}
          isLoggedIn
          saved
          saving={false}
          onClose={() => setSong(null)}
          onToggleSave={() => setSong(null)}
        />
      )}

      {/* Preview of a saved item (poster/details looked up on TMDb by title + year) */}
      {preview && (
        <MediaModal
          result={preview}
          isLoggedIn
          saved
          saving={false}
          onClose={() => setPreview(null)}
          onToggleSave={() => setPreview(null)}
          savedItem={previewItem}
          onUpdateSaved={previewItem ? (patch) => updateSaved(previewItem.id, patch) : undefined}
        />
      )}

      {/* AI Recommendations Modal */}
      {showAiModal && (
        <div className="imdb-modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="ai-recommend-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/5 bg-[#1a1f2e]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✨</span>
                {t('ai_recommendations_title')}
              </h2>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {aiLoading && (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-cinema-text-muted text-sm">{t('ai_analyzing')}</p>
                </div>
              )}

              {aiError && !aiLoading && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">⚠️</div>
                  <p className="text-cinema-text-muted mb-4">{aiError}</p>
                  <button
                    onClick={fetchAiRecommendations}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
                  >
                    {t('ai_try_again')}
                  </button>
                </div>
              )}

              {!aiLoading && !aiError && aiRecommendations && aiRecommendations.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-cinema-text-muted">{t('ai_empty_hint')}</p>
                </div>
              )}

              {!aiLoading && !aiError && aiRecommendations && aiRecommendations.length > 0 && (
                <div>
                  {aiRecommendations.map((rec, idx) => (
                    <div key={idx} className="rec-item">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {typeIcons[rec.type] || '🎬'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-white text-sm leading-tight">
                              {rec.title}
                            </h3>
                            <span className="text-sm text-cinema-text-muted bg-white/5 px-1.5 py-0.5 rounded">
                              {aiTypeLabels[rec.type] || rec.type}
                            </span>
                            {rec.suggestedPlatform && (
                              <span className="text-sm">
                                {aiPlatformIcons[rec.suggestedPlatform] || '📌'} {rec.suggestedPlatform}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-cinema-text-muted leading-relaxed">
                            <span className="text-purple-300 font-medium">{t('ai_reason')}</span>{' '}
                            {rec.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
