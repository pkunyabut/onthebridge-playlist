'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { MediaItem } from '@/lib/types';
import { MEDIA_TYPE_LABELS } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

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
    if (!confirm('ต้องการลบรายการนี้หรือไม่?')) return;

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

  const groupedItems = mediaItems.reduce<Record<string, MediaItem[]>>((acc, item) => {
    const type = item.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const filteredGroups = filter === 'all'
    ? groupedItems
    : Object.fromEntries(
        Object.entries(groupedItems).filter(([type]) => type === filter)
      );

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            รายการของฉัน
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ทั้งหมด {mediaItems.length} รายการ
          </p>
        </div>
        <Link
          href="/dashboard/add"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <span>➕</span>
          เพิ่มรายการ
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          ทั้งหมด
        </button>
        {Object.entries(MEDIA_TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {typeIcons[type]} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {mediaItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            ยังไม่มีรายการ
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            เริ่มเพิ่มรายการภาพยนตร์ ซีส์ หรือเพลงที่ชอบเลย!
          </p>
          <Link
            href="/dashboard/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <span>➕</span>
            เพิ่มรายการแรก
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGroups).map(([type, items]) => (
            <div key={type}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span>{typeIcons[type]}</span>
                {MEDIA_TYPE_LABELS[type as keyof typeof MEDIA_TYPE_LABELS]}
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                  ({items.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1"
                        aria-label="ลบ"
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
                      {item.platform && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 dark:text-gray-500">แพลตฟอร์ม:</span>
                          <span className="font-medium">{item.platform}</span>
                        </div>
                      )}
                      {item.genre && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 dark:text-gray-500">หมวด:</span>
                          <span className="font-medium">{item.genre}</span>
                        </div>
                      )}
                      {item.year && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 dark:text-gray-500">ปี:</span>
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
  );
}
