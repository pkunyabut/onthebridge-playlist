'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import MediaCard from '@/components/MediaCard';
import CardSkeleton from '@/components/CardSkeleton';
import type { MediaItem, PlatformType } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/types';
import type { TmdbMediaType, TmdbResult } from '@/lib/tmdb';

function savedKey(title: string, year: number | null) {
  return `${title.trim().toLowerCase()}|${year ?? ''}`;
}

export default function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeTab, setTypeTab] = useState<TmdbMediaType>('movie');
  const [providerFilter, setProviderFilter] = useState<Set<PlatformType>>(new Set());

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
    fetch('/api/media')
      .then((res) => (res.ok ? res.json() : null))
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
        `/api/tmdb?q=${encodeURIComponent(searchTerm)}&type=${type}&page=${pageNum}`
      );
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการค้นหา');
        if (!append) setResults([]);
        return;
      }

      setResults((prev) => (append ? [...prev, ...data.results] : data.results));
      setTotalPages(data.total_pages || 0);
      setPage(pageNum);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
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
  }, [debouncedQuery, typeTab]);

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
            type: result.type === 'movie' ? 'movie' : 'series',
            platform,
            genre: null,
            year: result.year,
            notes: null,
          }),
        });
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

  const providerEntries = Object.entries(PLATFORM_LABELS) as [PlatformType, string][];

  return (
    <AppShell>
      <div className="pb-20 md:pb-0">
        {/* Search Input */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">ค้นหา</h1>
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
              placeholder="ค้นหาหนังหรือซีรีส์..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 mb-3">
          {(['movie', 'tv'] as TmdbMediaType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeTab(t)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                typeTab === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {t === 'movie' ? '🎬 หนัง' : '📺 ซีรีส์'}
            </button>
          ))}
        </div>

        {/* Provider Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={() => setProviderFilter(new Set())}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
              providerFilter.size === 0
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            ทั้งหมด
          </button>
          {providerEntries.map(([platform, label]) => (
            <button
              key={platform}
              onClick={() => toggleProvider(platform)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
                providerFilter.has(platform)
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !debouncedQuery ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              เริ่มค้นหาหนังหรือซีรีส์
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              พิมพ์ชื่อเรื่องที่ต้องการค้นหาด้านบน
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              ไม่พบผลลัพธ์
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              ลองค้นหาด้วยคำอื่น หรือเปลี่ยนตัวกรองแพลตฟอร์ม
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchResults(debouncedQuery, typeTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
