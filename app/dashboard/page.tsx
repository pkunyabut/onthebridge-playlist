'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { MediaItem } from '@/lib/types';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

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
  const [showAiSection, setShowAiSection] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/media', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/media?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

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
    setShowAiSection(true);

    // Show hint when no items instead of calling API
    if (mediaItems.length === 0) {
      setAiLoading(false);
      setAiError(t('ai_empty_hint'));
      return;
    }

    try {
      const items = mediaItems.map((item) => ({
        title: item.title,
        type: item.type,
        platform: item.platform,
        genre: item.genre || undefined,
        year: item.year || undefined,
      }));

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
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

  // Stats by type
  const statsByType = mediaItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  // Recent items (last 6)
  const recentItems = [...mediaItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const filteredItems = filter === 'all'
    ? recentItems
    : recentItems.filter((item) => item.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cinema-text-muted">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden glass border border-cinema-border animate-fade-up">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-600/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-cinema-text mb-2">
            {t('my_items')}
          </h1>
          <p className="text-cinema-text-muted text-sm md:text-base mb-4">
            {t('total_items', { count: mediaItems.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/add"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white rounded-xl font-medium text-sm transition-all shadow-gold hover:shadow-gold-lg active:scale-95"
            >
              <span>➕</span>
              {t('add_item')}
            </Link>
            <button
              onClick={fetchAiRecommendations}
              disabled={aiLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl font-medium text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
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

      {/* AI Recommendations Section */}
      {showAiSection && (
        <div className="mb-8 p-6 rounded-2xl glass border border-purple-500/20 animate-fade-up">
          <h2 className="text-lg font-bold text-cinema-text mb-4 flex items-center gap-2">
            <span>✨</span>
            {t('ai_recommendations_title')}
          </h2>

          {aiLoading && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-cinema-text-muted text-sm">{t('ai_analyzing')}</p>
            </div>
          )}

          {aiError && !aiLoading && (
            <div className="text-center py-8">
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
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-cinema-text-muted">{t('ai_empty_hint')}</p>
            </div>
          )}

          {!aiLoading && !aiError && aiRecommendations && aiRecommendations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/5 border border-cinema-border hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {typeIcons[rec.type] || '🎬'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-cinema-text text-sm leading-tight mb-1">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-cinema-text-muted mb-2">
                        {aiTypeLabels[rec.type] || rec.type}
                      </p>
                      <p className="text-xs text-cinema-text-muted/80 leading-relaxed">
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
      )}

      {/* Stats Cards */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 stagger-grid">
          {Object.entries(typeLabels).map(([type, label]) => {
            const count = statsByType[type] || 0;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? 'all' : type)}
                className={`p-4 rounded-xl glass border transition-all duration-300 hover:-translate-y-1 hover:shadow-gold text-left ${
                  filter === type ? 'border-brand-500/50 shadow-glow' : 'border-cinema-border'
                }`}
              >
                <div className="text-2xl mb-1">{typeIcons[type]}</div>
                <div className="text-xl font-bold text-cinema-text">{count}</div>
                <div className="text-xs text-cinema-text-muted">{label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-gold'
              : 'glass text-cinema-text-muted hover:text-cinema-text border border-cinema-border'
          }`}
        >
          {t('filter_all')}
        </button>
        {Object.entries(typeLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === type
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-gold'
                : 'glass text-cinema-text-muted hover:text-cinema-text border border-cinema-border'
            }`}
          >
            {typeIcons[type]} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mediaItems.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl border border-cinema-border animate-fade-up">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-cinema-text mb-2">
            {t('no_items_title')}
          </h3>
          <p className="text-cinema-text-muted mb-6 text-sm">
            {t('no_items_hint')}
          </p>
          <Link
            href="/dashboard/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white rounded-xl font-medium text-sm transition-all shadow-gold hover:shadow-gold-lg active:scale-95"
          >
            <span>➕</span>
            {t('add_first_item')}
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl border border-cinema-border">
          <div className="text-4xl mb-3">{typeIcons[filter]}</div>
          <p className="text-cinema-text-muted">{t('no_items_in_category')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass rounded-xl p-4 border border-cinema-border hover:border-brand-500/30 hover:shadow-gold transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{typeIcons[item.type]}</span>
                  <h3 className="font-semibold text-cinema-text text-sm leading-tight line-clamp-2">
                    {item.title}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="text-cinema-text-muted hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10"
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
                {item.platform && (
                  <div className="flex items-center gap-1">
                    <span className="text-cinema-text-muted/60">{t('label_platform')}</span>
                    <span className="font-medium text-cinema-text">{item.platform}</span>
                  </div>
                )}
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
      )}
    </div>
  );
}
