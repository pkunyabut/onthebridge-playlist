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
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌉</span>
            <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
              {t('app_name')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <Link
              href="/search"
              className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg font-medium text-sm transition-colors"
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-14 md:py-20 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          {t('hero_line1')}{' '}
          <span className="text-brand-600 dark:text-brand-400">{t('hero_line2_highlight')}</span>{' '}
          {t('hero_line3')}
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          {t('hero_sub1')}
          <br />
          {t('hero_sub2')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!isLoggedIn && (
            <Link
              href="/login"
              className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-brand-600/20"
            >
              {t('cta_start_free')}
            </Link>
          )}
          <a
            href="#browse"
            className="px-8 py-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-lg transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            {t('cta_browse')}
          </a>
        </div>
      </section>

      {/* Browse */}
      <section id="browse" className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          {t('browse_title_1')} <span className="whitespace-nowrap">{t('browse_title_2')}</span> {t('browse_title_3')} {t('browse_title_4')}
        </h2>

        {/* Type Tabs */}
        <div className="flex justify-center gap-2 mb-3">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeTab(tab.value)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                typeTab === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Sub-tabs */}
        <div className="flex justify-center gap-2 mb-4">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryTab(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                categoryTab === tab.value
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Country Filter Tabs */}
        <div className="flex justify-center gap-2 mb-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">{t('filter_country')}:</span>
          <button
            onClick={() => setCountry(DEFAULT_COUNTRY)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
              country === DEFAULT_COUNTRY
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('filter_all')}
          </button>
          {COUNTRY_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setCountry(opt.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                country === opt.code
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {opt.flag} {opt.label}
            </button>
          ))}
        </div>

        {/* Language Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center mr-1">{t('filter_language')}:</span>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                language === opt.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm text-center">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('no_data_title')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('no_data_desc')}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => setModalResult(result)}
                  className="cursor-pointer"
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
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {loadingMore ? t('loading_more') : t('load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Platforms */}
      <section className="bg-brand-50 dark:bg-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('platforms_title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {t('platforms_subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {[
              { name: 'Netflix', url: 'https://www.netflix.com' },
              { name: 'Disney+', url: 'https://www.disneyplus.com' },
              { name: 'HBO Max', url: 'https://www.hbomax.com' },
              { name: 'Prime Video', url: 'https://www.primevideo.com' },
              { name: 'YouTube', url: 'https://www.youtube.com' },
              { name: 'WeTV', url: 'https://wetv.vip' },
              { name: 'VIU', url: 'https://www.viu.com' },
              { name: 'iQIYI', url: 'https://www.iq.com' },
              { name: 'Youku', url: 'https://www.youku.com' },
              { name: 'Spotify', url: 'https://open.spotify.com' },
              { name: 'Apple Music', url: 'https://music.apple.com' },
            ].map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white dark:bg-slate-700 rounded-full text-gray-700 dark:text-gray-200 font-medium shadow-sm hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
              >
                {platform.name} ↗
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!isLoggedIn && (
        <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('cta_title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            {t('cta_subtitle')}
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-brand-600/20"
          >
            {t('cta_signup_free')}
          </Link>
        </section>
      )}

      {/* Terms of Service */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          {t('terms_title')}
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 md:p-8 space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">1.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_purpose')}</strong> {t('terms_purpose_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">2.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_not_owner')}</strong> {t('terms_not_owner_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">3.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_data')}</strong> {t('terms_data_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">4.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_account')}</strong> {t('terms_account_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">5.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_ai')}</strong> {t('terms_ai_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">6.</span>
            <p><strong className="text-gray-900 dark:text-white">{t('terms_free')}</strong> {t('terms_free_text')}</p>
          </div>
          <div className="flex gap-3">
            <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0">7.</span>
            <p>{t('terms_made_with')}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-slate-700 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t('footer_copyright')}</p>
          <p className="mt-1">{t('footer_made_with')}</p>
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
            // Close modal after save action completes
            setTimeout(() => setModalResult(null), 600);
          }}
        />
      )}
    </div>
  );
}
