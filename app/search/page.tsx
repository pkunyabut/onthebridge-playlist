'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import MediaCard from '@/components/MediaCard';
import CardSkeleton from '@/components/CardSkeleton';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, PlatformType } from '@/lib/types';
import { toMediaType } from '@/lib/types';
import type { TmdbMediaType, TmdbResult } from '@/lib/tmdb';
import { WATCH_REGIONS, DEFAULT_WATCH_REGION, DEFAULT_LANGUAGE, DEFAULT_COUNTRY, COUNTRY_OPTIONS, type WatchRegion } from '@/lib/tmdb';

function savedKey(title: string, year: number | null) {
  return `${title.trim().toLowerCase()}|${year ?? ''}`;
}

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

export default function SearchPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeTab, setTypeTab] = useState<TmdbMediaType>('movie');
  const [providerFilter, setProviderFilter] = useState<Set<PlatformType>>(new Set());
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [watchRegion, setWatchRegion] = useState<WatchRegion>(DEFAULT_WATCH_REGION);
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);

  const [results, setResults] = useState<TmdbResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const fetchResults = async (searchTerm: string, type: TmdbMediaType, pageNum: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/tmdb?q=${encodeURIComponent(searchTerm)}&type=${type}&page=${pageNum}&language=${language}&watch_region=${watchRegion}&country=${country}`
      );
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;

      if (!res.ok) {
        setError(data.error || t('error_search'));
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
    if (!debouncedQuery) {
      setResults([]);
      setTotalPages(0);
      setPage(1);
      return;
    }
    fetchResults(debouncedQuery, typeTab, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, typeTab, language, watchRegion]);

  const toggleProvider = (platform: PlatformType) => {
    setProviderFilter((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const filteredResults = useMemo(() => {
    if (providerFilter.size === 0) return results;
    return results.filter((r) => r.providers.some((p) => providerFilter.has(p)));
  }, [results, providerFilter]);

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
            type: toMediaType(result.type),
            platform,
            genre: null,
            year: result.year,
            notes: null,
            ...(/^\d+$/.test(String(result.id))
              ? { tmdb_id: Number(result.id), tmdb_media: result.type === 'tv' ? 'tv' : 'movie' }
              : {}),
            cover_url: result.poster,
          }),
        });
        if (res.status === 401) {
          alert(t('login_required_save'));
          router.push('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.media) {
          setSavedMap((prev) => ({ ...prev, [key]: data.media.id }));
          alert(t('save_success').replace('{title}', result.title));
        } else {
          alert(t('save_failed').replace('{error}', data.error || t('unknown_error')));
        }
      }
    } catch {
      alert(t('save_failed').replace('{error}', t('error_connection')));
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(String(result.id));
        return next;
      });
    }
  };

  const providerLabels: Record<string, string> = {
    netflix: 'Netflix',
    disney: 'Disney+',
    hbo: 'HBO Max',
    prime: 'Prime Video',
    youtube: 'YouTube',
    spotify: 'Spotify',
    apple_music: 'Apple Music',
    wetv: 'WeTV',
    viu: 'VIU',
    iqiyi: 'iQIYI',
    youku: 'Youku',
    other: t('type_other'),
  };

  const providerEntries = Object.entries(providerLabels) as [PlatformType, string][];

  return (
    <AppShell>
      <div className="pb-20 md:pb-0">
        {/* Search Header — IMDb style */}
        <div className="relative mb-6 p-5 md:p-7 rounded-xl overflow-hidden glass border border-cinema-border animate-fade-up">
          <div className="absolute top-0 right-0 w-56 h-40 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-44 h-32 bg-brand-600/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative z-10">
            <h1 className="text-xl md:text-2xl font-bold text-white mb-4">{t('search_title')}</h1>

            {/* Search Input */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 rounded-xl opacity-20 group-hover:opacity-40 group-focus-within:opacity-50 blur transition-opacity duration-300" />
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-cinema-900 border border-cinema-border text-white placeholder-cinema-text-muted text-sm focus:outline-none focus:border-brand-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-1.5 mb-4">
          {(['movie', 'tv'] as TmdbMediaType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeTab(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                typeTab === type
                  ? 'bg-brand-600 text-white shadow-gold'
                  : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/5'
              }`}
            >
              {type === 'movie' ? t('type_tab_movie') : t('type_tab_tv')}
            </button>
          ))}
        </div>

        {/* Provider Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={() => setProviderFilter(new Set())}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              providerFilter.size === 0
                ? 'bg-brand-600 text-white'
                : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/5'
            }`}
          >
            {t('filter_all')}
          </button>
          {providerEntries.map(([platform, label]) => (
            <button
              key={platform}
              onClick={() => toggleProvider(platform)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                providerFilter.has(platform)
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-cinema-text-muted hover:bg-white/10 border border-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Results Grid — IMDb style */}
        {loading ? (
          <div className="imdb-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !debouncedQuery ? (
          <div className="text-center py-20 glass rounded-xl border border-cinema-border animate-fade-up">
            <div className="text-6xl mb-6 animate-float">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {t('start_search_title')}
            </h3>
            <p className="text-cinema-text-muted text-sm max-w-sm mx-auto">
              {t('start_search_hint')}
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-20 glass rounded-xl border border-cinema-border animate-fade-up">
            <div className="text-6xl mb-6">📭</div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {t('no_results_title')}
            </h3>
            <p className="text-cinema-text-muted text-sm max-w-sm mx-auto">
              {t('no_results_hint')}
            </p>
          </div>
        ) : (
          <>
            <div className="imdb-grid stagger-grid">
              {filteredResults.map((result) => (
                <MediaCard
                  key={`${result.type}-${result.id}`}
                  result={result}
                  saved={!!savedMap[savedKey(result.title, result.year)]}
                  saving={savingKeys.has(String(result.id))}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchResults(debouncedQuery, typeTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-cinema-text rounded-xl font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {loadingMore ? t('loading_more') : t('load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
