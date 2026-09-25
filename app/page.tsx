'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import MediaCard from '@/components/MediaCard';
import CardSkeleton from '@/components/CardSkeleton';
import MediaModal from '@/components/MediaModal';
import ServicePicker from '@/components/ServicePicker';
import SuggestionRow from '@/components/SuggestionRow';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem, PlatformType } from '@/lib/types';
import { toMediaType } from '@/lib/types';
import {
  WATCH_REGIONS,
  DEFAULT_WATCH_REGION,
  DEFAULT_LANGUAGE,
  DEFAULT_COUNTRY,
  COUNTRY_OPTIONS,
  SERVICE_OPTIONS,
  ORIGIN_REGIONS,
  serviceProviderIds,
  isOnMyServices,
  getService,
  type WatchRegion,
  type CountryOption,
  type BrowseMode,
  type TmdbGenre,
  type TmdbRowItem,
} from '@/lib/tmdb';
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

// localStorage keys for the choices the user asked us to remember (items 4 & 5).
const LS_SERVICES = 'otb-my-services';
const LS_MODE = 'otb-browse-mode';
const LS_ONLY_MINE = 'otb-only-mine';

function savedKey(title: string, year: number | null) {
  return `${title.trim().toLowerCase()}|${year ?? ''}`;
}

function toResult(item: TmdbRowItem): TmdbResult {
  return {
    id: item.id,
    title: item.title,
    year: item.year,
    poster: item.poster,
    rating: item.rating,
    type: item.type,
    providers: [],
    has_th_providers: false,
    origin_country: null,
    provider_ids: [],
  };
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

  // Item 5 — สตรีมมิ่ง / โรงภาพยนตร์
  const [mode, setMode] = useState<BrowseMode>('streaming');
  // Item 3 — genre filter
  const [genres, setGenres] = useState<{ movie: TmdbGenre[]; tv: TmdbGenre[] }>({ movie: [], tv: [] });
  const [genreId, setGenreId] = useState<string | null>(null);
  // Item 4 — my streaming services
  const [serviceKeys, setServiceKeys] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Item 6 — curated rows
  const [trendingRow, setTrendingRow] = useState<TmdbRowItem[]>([]);
  const [topRatedRow, setTopRatedRow] = useState<TmdbRowItem[]>([]);
  const [forYouRow, setForYouRow] = useState<TmdbRowItem[]>([]);
  const [forYouSource, setForYouSource] = useState('');
  const [rowsLoading, setRowsLoading] = useState(true);
  // Item 7 — Thai / Asian section
  const [originRegion, setOriginRegion] = useState('TH');
  const [originMedia, setOriginMedia] = useState<'movie' | 'tv'>('movie');
  const [originItems, setOriginItems] = useState<TmdbRowItem[]>([]);
  const [originSource, setOriginSource] = useState('');
  const [originLoading, setOriginLoading] = useState(true);

  const [results, setResults] = useState<TmdbResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [savedTitles, setSavedTitles] = useState<string[]>([]);
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

  // ---------------------------------------------------------------------
  // Remembered choices (items 4 & 5)
  // ---------------------------------------------------------------------
  useEffect(() => {
    try {
      const storedServices = localStorage.getItem(LS_SERVICES);
      if (storedServices) {
        const parsed = JSON.parse(storedServices);
        if (Array.isArray(parsed)) {
          setServiceKeys(parsed.filter((k: unknown) => typeof k === 'string' && !!getService(k as string)));
        }
      }
      const storedMode = localStorage.getItem(LS_MODE);
      if (storedMode === 'theaters' || storedMode === 'streaming') setMode(storedMode);
      if (localStorage.getItem(LS_ONLY_MINE) === '1') setOnlyMine(true);
    } catch {
      // Corrupt storage must never break the page.
    }
  }, []);

  const updateServices = useCallback((keys: string[]) => {
    setServiceKeys(keys);
    try {
      localStorage.setItem(LS_SERVICES, JSON.stringify(keys));
    } catch {}
  }, []);

  const updateOnlyMine = useCallback((value: boolean) => {
    setOnlyMine(value);
    try {
      localStorage.setItem(LS_ONLY_MINE, value ? '1' : '0');
    } catch {}
  }, []);

  const updateMode = useCallback((value: BrowseMode) => {
    setMode(value);
    try {
      localStorage.setItem(LS_MODE, value);
    } catch {}
  }, []);

  // ---------------------------------------------------------------------
  // Session + watchlist
  // ---------------------------------------------------------------------
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
        const titles: string[] = [];
        for (const item of data.media) {
          map[savedKey(item.title, item.year)] = item.id;
          titles.push(item.title);
        }
        setSavedMap(map);
        setSavedTitles(titles.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  // ---------------------------------------------------------------------
  // Item 3 — genre lists in Thai
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    fetch('/api/tmdb/genres?language=th')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { movie?: TmdbGenre[]; tv?: TmdbGenre[] } | null) => {
        if (cancelled || !data) return;
        setGenres({ movie: data.movie ?? [], tv: data.tv ?? [] });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------
  // Browse grid (items 3-5)
  // ---------------------------------------------------------------------
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

    const providerIds = onlyMine ? serviceProviderIds(serviceKeys) : [];
    const params = new URLSearchParams({
      type,
      category,
      page: String(pageNum),
      language,
      watch_region: watchRegion,
      country,
      mode,
    });
    if (genreId) params.set('genre', genreId);
    if (providerIds.length > 0) params.set('providers', providerIds.join(','));
    if (country !== DEFAULT_COUNTRY) params.set('origin', country);

    try {
      const res = await fetch(`/api/tmdb/popular?${params.toString()}`);
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
  }, [typeTab, categoryTab, language, watchRegion, country, mode, genreId, onlyMine, serviceKeys]);

  // ---------------------------------------------------------------------
  // Item 6 — curated rows
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setRowsLoading(true);
    const load = async (kind: string, extra = '') => {
      const res = await fetch(`/api/tmdb/rows?kind=${kind}&language=${language}${extra}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ items?: TmdbRowItem[]; source?: string }>;
    };
    Promise.all([load('trending'), load('top_rated')])
      .then(([trending, topRated]) => {
        if (cancelled) return;
        setTrendingRow(trending?.items ?? []);
        setTopRatedRow(topRated?.items ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRowsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // แนะนำสำหรับคุณ — based on the saved watchlist; falls back to trending server-side.
  useEffect(() => {
    let cancelled = false;
    const query =
      savedTitles.length > 0 ? `&titles=${encodeURIComponent(savedTitles.join('|'))}` : '';
    fetch(`/api/tmdb/rows?kind=for_you&language=${language}${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: TmdbRowItem[]; source?: string } | null) => {
        if (cancelled || !data) return;
        setForYouRow(data.items ?? []);
        setForYouSource(data.source ?? '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [savedTitles, language]);

  // ---------------------------------------------------------------------
  // Item 7 — Thai / Asian row
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setOriginLoading(true);
    fetch(`/api/tmdb/rows?kind=origin&region=${originRegion}&media=${originMedia}&language=${language}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: TmdbRowItem[]; source?: string } | null) => {
        if (cancelled || !data) return;
        setOriginItems(data.items ?? []);
        setOriginSource(data.source ?? '');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOriginLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [originRegion, originMedia, language]);

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

  const myGenreList: TmdbGenre[] = typeTab === 'tv' ? genres.tv : genres.movie;
  const selectedServices = SERVICE_OPTIONS.filter((s) => serviceKeys.includes(s.key));
  const unbackedServices = selectedServices.filter((s) => !s.thBacked);
  const onlyMineUnavailable = onlyMine && serviceProviderIds(serviceKeys).length === 0;
  const originRegionOption = ORIGIN_REGIONS.find((r) => r.key === originRegion);

  return (
    <div className="min-h-screen bg-cinema-950">
      {/* Header — IMDb-style dark bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-cinema-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden="true">🌉</span>
            <span className="text-lg font-bold text-gold-gradient truncate">
              {t('app_name')}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="px-3 py-2 rounded-lg text-sm font-bold border border-cinema-border text-cinema-text-muted hover:bg-cinema-700 transition-colors"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <Link
              href="/search"
              className="px-3 py-2 text-cinema-text hover:bg-cinema-800 rounded-lg font-medium text-base transition-colors"
            >
              🔍 {t('nav_search')}
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-base transition-colors"
              >
                {t('nav_dashboard')}
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-base transition-colors"
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
        <p className="text-lg md:text-xl text-cinema-text-muted mb-8 max-w-2xl mx-auto">
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

      {/* Item 6 — suggestion rows */}
      <section className="max-w-7xl mx-auto px-4 pb-4">
        <SuggestionRow
          title="กำลังมาแรง"
          icon="🔥"
          items={trendingRow}
          loading={rowsLoading}
          onSelect={(item) => setModalResult(toResult(item))}
        />
        <SuggestionRow
          title="คะแนนสูงสุด"
          icon="🏆"
          items={topRatedRow}
          loading={rowsLoading}
          onSelect={(item) => setModalResult(toResult(item))}
        />
        <SuggestionRow
          title="แนะนำสำหรับคุณ"
          icon="✨"
          items={forYouRow}
          loading={rowsLoading}
          hint={
            savedTitles.length > 0
              ? `จากรอดูของคุณ ${savedTitles.length} เรื่อง`
              : 'ยังไม่มีรายการในรอดู — แสดงกำลังมาแรงแทน'
          }
          onSelect={(item) => setModalResult(toResult(item))}
        />
      </section>

      {/* Item 7 — Thai + Asian content */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="imdb-section-header">
          <h2>🌏 ไทยและเอเชีย</h2>
          {originSource && <span className="count">{originSource}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="segmented">
            <button
              className={originMedia === 'movie' ? 'active' : ''}
              onClick={() => setOriginMedia('movie')}
            >
              🎬 ภาพยนตร์
            </button>
            <button
              className={originMedia === 'tv' ? 'active' : ''}
              onClick={() => setOriginMedia('tv')}
            >
              📺 ซีรีส์
            </button>
          </div>
        </div>

        <div className="chip-row scrollbar-hide mb-2">
          {ORIGIN_REGIONS.map((region) => (
            <button
              key={region.key}
              onClick={() => setOriginRegion(region.key)}
              className={`chip ${originRegion === region.key ? 'active' : ''}`}
            >
              {region.flag} {region.label}
            </button>
          ))}
        </div>

        <div className="suggest-row scrollbar-hide">
          {originLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="suggest-card">
                  <div className="poster shimmer" />
                  <div className="info">
                    <div className="h-4 w-4/5 rounded bg-white/10" />
                    <div className="h-3 w-2/5 mt-2 rounded bg-white/10" />
                  </div>
                </div>
              ))
            : originItems.length === 0
            ? (
                <p className="text-base text-cinema-text-muted py-3">
                  {t('no_data_desc')} ({originRegionOption?.label ?? originRegion})
                </p>
              )
            : originItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className="suggest-card text-left"
                  onClick={() => setModalResult(toResult(item))}
                  aria-label={`${t('go_to')} ${item.title}`}
                >
                  <div className="poster">
                    {item.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.poster} alt={item.title} loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                    )}
                    {item.rating > 0 && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 text-sm font-bold">
                        <span className="text-imdb-yellow">★</span>
                        <span className="text-imdb-yellow">{item.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="info">
                    <p className="title">{item.title}</p>
                    <p className="meta">
                      {item.year && <span>{item.year}</span>}
                      {item.year && <span className="text-white/20">·</span>}
                      <span>{t(`type_${item.type}`)}</span>
                    </p>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Browse — IMDb-style grid */}
      <section id="browse" className="max-w-7xl mx-auto px-4 pb-16 md:pb-24">
        <div className="imdb-section-header">
          <h2>
            {t('browse_title_1')} <span className="whitespace-nowrap">{t('browse_title_2')}</span> {t('browse_title_3')} {t('browse_title_4')}
          </h2>
        </div>

        {/* Item 5 — segmented control: ที่สตรีมมิ่ง / ในโรงภาพยนตร์ */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="segmented">
            <button
              className={mode === 'streaming' ? 'active' : ''}
              onClick={() => updateMode('streaming')}
            >
              📺 ที่สตรีมมิ่ง
            </button>
            <button
              className={mode === 'theaters' ? 'active' : ''}
              onClick={() => updateMode('theaters')}
            >
              🎟️ ในโรงภาพยนตร์
            </button>
          </div>
        </div>

        {/* Item 4 — my streaming services */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => setPickerOpen(true)} className="chip">
            📺 เลือกบริการที่คุณดูอยู่
            {serviceKeys.length > 0 && <span className="text-cinema-gold-light">({serviceKeys.length})</span>}
          </button>
          {serviceKeys.length > 0 && (
            <button
              onClick={() => updateOnlyMine(!onlyMine)}
              className={`chip ${onlyMine ? 'active' : ''}`}
            >
              {onlyMine ? '✓ ' : ''}เฉพาะบริการของฉัน
            </button>
          )}
          {selectedServices.length > 0 && (
            <span className="text-sm text-cinema-text-muted">
              {selectedServices.map((s) => s.label).join(' · ')}
            </span>
          )}
          {onlyMineUnavailable && (
            <span className="text-sm text-brand-300">
              บริการที่เลือกยังไม่มีข้อมูลใน TMDb จึงยังกรองไม่ได้
            </span>
          )}
          {!onlyMineUnavailable && unbackedServices.length > 0 && (
            <span className="text-sm text-cinema-text-muted">
              {unbackedServices.map((s) => s.label).join(', ')} ยังใช้กรองไม่ได้ (TMDb ไม่มีข้อมูลไทย)
            </span>
          )}
        </div>

        {mode === 'theaters' ? (
          <p className="mb-5 text-base text-cinema-text-muted">
            🎟️ กำลังแสดงภาพยนตร์ที่ฉายในโรงภาพยนตร์ไทย (TMDb now_playing ภูมิภาค TH) —
            ตัวกรองประเภท/หมวด/หมวดหมู่/บริการ ใช้ได้ในโหมด &ldquo;ที่สตรีมมิ่ง&rdquo;
          </p>
        ) : (
          <>
            {/* Type Tabs — IMDb style */}
            <div className="flex justify-start gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setTypeTab(tab.value)}
                  className={`px-4 py-2.5 rounded-lg text-base font-medium transition-all whitespace-nowrap min-h-[44px] ${
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
            <div className="flex gap-2 mb-4">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setCategoryTab(tab.value)}
                  className={`px-4 py-2.5 rounded-lg text-base font-medium transition-all min-h-[44px] ${
                    categoryTab === tab.value
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-cinema-text-muted hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Item 3 — genre filter (Thai names from TMDb) */}
            {myGenreList.length > 0 && (
              <div className="chip-row scrollbar-hide mb-5">
                <button
                  onClick={() => setGenreId(null)}
                  className={`chip ${genreId === null ? 'active' : ''}`}
                >
                  ทั้งหมด
                </button>
                {myGenreList.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => setGenreId(String(genre.id))}
                    className={`chip ${genreId === String(genre.id) ? 'active' : ''}`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-base text-center">
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
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('no_data_title')}
            </h3>
            <p className="text-cinema-text-muted text-base">
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
                    onMyService={isOnMyServices(result, serviceKeys)}
                  />
                </div>
              ))}
            </div>

            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchResults(typeTab, categoryTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-cinema-text rounded-xl font-medium text-base hover:bg-white/10 transition-colors disabled:opacity-50 min-h-[44px]"
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
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {t('platforms_title')}
          </h2>
          <p className="text-cinema-text-muted mb-6 text-base">
            {t('platforms_subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { name: 'Netflix', url: 'https://www.netflix.com' },
              { name: 'Disney+', url: 'https://www.disneyplus.com' },
              { name: 'HBO Max', url: 'https://www.hbomax.com' },
              { name: 'Prime Video', url: 'https://www.primevideo.com' },
              { name: 'Apple TV+', url: 'https://tv.apple.com' },
              { name: 'YouTube Premium', url: 'https://www.youtube.com/premium' },
              { name: 'WeTV', url: 'https://wetv.vip' },
              { name: 'VIU', url: 'https://www.viu.com' },
              { name: 'iQIYI', url: 'https://www.iq.com' },
              { name: 'Spotify', url: 'https://open.spotify.com' },
              { name: 'Apple Music', url: 'https://music.apple.com' },
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
          <p className="text-cinema-text-muted mb-6 text-base">
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
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-cinema-text-muted">
          <p>{t('footer_copyright')}</p>
          <p className="mt-1">{t('footer_made_with')}</p>
          <a href="mailto:thonglorproduction@gmail.com" className="mt-2 inline-block text-brand-400 hover:text-brand-300 transition-colors">
            ✉️ thonglorproduction@gmail.com
          </a>
        </div>
      </footer>

      {/* Item 4 — service picker */}
      <ServicePicker
        open={pickerOpen}
        selected={serviceKeys}
        onlyMine={onlyMine}
        onChange={updateServices}
        onToggleOnlyMine={updateOnlyMine}
        onClose={() => setPickerOpen(false)}
      />

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