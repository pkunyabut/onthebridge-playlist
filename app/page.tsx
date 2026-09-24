'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import MediaCard from '@/components/MediaCard';
import CardSkeleton from '@/components/CardSkeleton';
import MediaModal from '@/components/MediaModal';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, PlatformType } from '@/lib/types';
import { WATCH_REGIONS, DEFAULT_WATCH_REGION, DEFAULT_LANGUAGE, DEFAULT_COUNTRY, COUNTRY_OPTIONS, type WatchRegion, type CountryOption } from '@/lib/tmdb';
import type { TmdbCategory, TmdbMediaType, TmdbResult } from '@/lib/tmdb';

const REGION_LABELS: Record<WatchRegion, string> = {
  TH: '🇹🇭 ไทย',
  US: '🇺🇸 อเมริกา',
  KR: '🇰🇷 เกาหลี',
  CN: '🇨🇳 จีน',
  JP: '🇯🇵 ญี่ปุ่น',
};

const LANGUAGE_OPTIONS = [
  { value: 'th-TH', label: '🇹🇭 ไทย' },
  { value: 'en-US', label: '🇺🇸 อังกฤษ' },
  { value: 'ko-KR', label: '🇰🇷 เกาหลี' },
  { value: 'zh-CN', label: '🇨🇳 จีน' },
  { value: 'ja-JP', label: '🇯🇵 ญี่ปุ่น' },
];

function savedKey(title: string, year: number | null) {
  return `${title.trim().toLowerCase()}|${year ?? ''}`;
}

export default function LandingPage() {
  const router = useRouter();
  const requestIdRef = useRef(0);
  const { t, lang, setLang } = useLanguage();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [typeTab, setTypeTab] = useState<TmdbMediaType>('movie');
  const [categoryTab, setCategoryTab] = useState<TmdbCategory>('popular');
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [watchRegion, setWatchRegion] = useState<WatchRegion>(DEFAULT_WATCH_REGION);
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);

  const [results, setResults] = useState<TmdbResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [modalResult, setModalResult] = useState<TmdbResult | null>(null);

  const TYPE_TABS: { value: TmdbMediaType; label: string }[] = [
    { value: 'movie', label: t('type_tab_movie') },
    { value: 'tv', label: t('type_tab_tv') },
    { value: 'documentary', label: t('type_tab_documentary') },
    { value: 'music', label: t('type_tab_music') },
  ];

  const CATEGORY_TABS: { value: TmdbCategory; label: string }[] = [
    { value: 'popular', label: t('category_popular') },
    { value: 'top_rated', label: t('category_top_rated') },
  ];

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => {
        setIsLoggedIn(res.ok);
        return res.ok ? res.json() : null;
      })
      .then(() => {
        return fetch('/api/media').then((res) => (res.ok ? res.json() : null));
      })
      .then((data: { media?: MediaItem[] } | null) => {
        if (!data?.media) return;
        const map: Record<string, string> = {};
        for (const item of data.media) {
          map[savedKey(item.title, item.year)] = item.id;
        }
        setSavedMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchResults = async (
    type: TmdbMediaType,
    category: TmdbCategory,
    pageNum: number,
    append: boolean
  ) => {
    const requestId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/tmdb/popular?type=${type}&category=${category}&page=${pageNum}&language=${language}&watch_region=${watchRegion}&country=${country}`
      );
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;

      if (!res.ok) {
        setError(data.error || t('error_loading'));
        if (!append) setResults([]);
        return;
      }

      setResults((prev) => (append ? [...prev, ...data.results] : data.results));
      setTotalPages(data.total_pages || 0);
      setPage(pageNum);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError(t('error_connection'));
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchResults(typeTab, categoryTab, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeTab, categoryTab, language, watchRegion, country]);

  const handleToggleSave = async (result: TmdbResult) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    const key = savedKey(result.title, result.year);
    const existingId = savedMap[key];

    setSavingKeys((prev) => new Set(prev).add(String(result.id)));
    try {
      if (existingId) {
        const res = await fetch(`/api/media?id=${existingId}`, { method: 'DELETE' });
        if (res.ok) {
          setSavedMap((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      } else {
        const platform: PlatformType = result.providers[0] || 'other';
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: result.title,
            type: result.type === 'tv' ? 'series' : result.type === 'movie' ? 'movie' : result.type === 'documentary' ? 'documentary' : 'music',
            platform,
            genre: null,
            year: result.year,
            notes: null,
          }),
        });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (res.ok && data.media) {
          setSavedMap((prev) => ({ ...prev, [key]: data.media.id }));
        }
      }
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(String(result.id));
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-cinema-950">
      {/* Header — IMDb-style dark bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-cinema-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <span className="text-lg font-bold text-gold-gradient">
              {t('app_name')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cinema-border text-cinema-text-muted hover:bg-cinema-700 transition-colors"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <Link
              href="/search"
              className="px-4 py-2 text-cinema-text hover:bg-cinema-800 rounded-lg font-medium text-sm transition-colors"
            >
              🔍 {t('nav_search')}
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {t('nav_dashboard')}
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {t('nav_login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero — IMDb-style cinematic */}
      <section className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
          {t('hero_line1')}{' '}
          <span className="text-gold-gradient">{t('hero_line2_highlight')}</span>{' '}
          {t('hero_line3')}
        </h1>
        <p className="text-base md:text-lg text-cinema-text-muted mb-8 max-w-2xl mx-auto">
          {t('hero_sub1')}
          <br />
          {t('hero_sub2')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isLoggedIn && (
            <Link
              href="/login"
              className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-gold"
            >
              {t('cta_start_free')}
            </Link>
          )}
          <a
            href="#browse"
            className="px-8 py-4 bg-white/5 border border-white/10 text-cinema-text rounded-xl font-semibold text-lg transition-colors hover:bg-white/10"
          >
            {t('cta_browse')}
          </a>
        </div>
      </section>

      {/* Browse — IMDb-style grid */}
      <section id="browse" className="max-w-7xl mx-auto px-4 pb-16 md:pb-24">
        <div className="imdb-section-header">
          <h2>
            {t('browse_title_1')} <span className="whitespace-nowrap">{t('browse_title_2')}</span> {t('browse_title_3')} {t('browse_title_4')}
          </h2>
        </div>

        {/* Type Tabs — IMDb style */}
        <div className="flex justify-start gap-1 mb-3 overflow-x-auto scrollbar-hide">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                typeTab === tab.value
                  ? 'bg-brand-600 text-white shadow-gold'
                  : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Sub-tabs */}
        <div className="flex gap-2 mb-5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryTab === tab.value
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-cinema-text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="imdb-grid">
            {Array.from({ length: 14 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 glass rounded-2xl border border-cinema-border">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('no_data_title')}
            </h3>
            <p className="text-cinema-text-muted text-sm">
              {t('no_data_desc')}
            </p>
          </div>
        ) : (
          <>
            <div className="imdb-grid">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => setModalResult(result)}
                >
                  <MediaCard
                    result={result}
                    saved={!!savedMap[savedKey(result.title, result.year)]}
                    saving={savingKeys.has(String(result.id))}
                    onToggleSave={handleToggleSave}
                  />
                </div>
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchResults(typeTab, categoryTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-cinema-text rounded-xl font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {loadingMore ? t('loading_more') : t('load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Platforms */}
      <section className="bg-cinema-900/50 py-14 border-y border-cinema-border">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
            {t('platforms_title')}
          </h2>
          <p className="text-cinema-text-muted mb-6 text-sm">
            {t('platforms_subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Netflix', url: 'https://www.netflix.com' },
              { name: 'Disney+', url: 'https://www.disneyplus.com' },
              { name: 'HBO Max', url: 'https://www.hbomax.com' },
              { name: 'Prime Video', url: 'https://www.primevideo.com' },
              { name: 'YouTube', url: 'https://www.youtube.com' },
              { name: 'WeTV', url: 'https://wetv.vip' },
              { name: 'VIU', url: 'https://www.viu.com' },
              { name: 'iQIYI', url: 'https://www.iq.com' },
              { name: 'Spotify', url: 'https://open.spotify.com' },
            ].map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="platform-badge"
              >
                {platform.name} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isLoggedIn && (
        <section className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {t('cta_title')}
          </h2>
          <p className="text-cinema-text-muted mb-6 text-sm">
            {t('cta_subtitle')}
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-gold"
          >
            {t('cta_signup_free')}
          </Link>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-cinema-border py-6 mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-cinema-text-muted">
          <p>{t('footer_copyright')}</p>
          <p className="mt-1">{t('footer_made_with')}</p>
          <a href="mailto:thonglorproduction@gmail.com" className="mt-2 inline-block text-brand-400 hover:text-brand-300 transition-colors">
            ✉️ thonglorproduction@gmail.com
          </a>
        </div>
      </footer>

      {/* Media Detail Modal */}
      {modalResult && (
        <MediaModal
          result={modalResult}
          isLoggedIn={isLoggedIn}
          saved={!!savedMap[savedKey(modalResult.title, modalResult.year)]}
          saving={savingKeys.has(String(modalResult.id))}
          onClose={() => setModalResult(null)}
          onToggleSave={(result) => {
            handleToggleSave(result);
            setTimeout(() => setModalResult(null), 600);
          }}
        />
      )}
    </div>
  );
}
