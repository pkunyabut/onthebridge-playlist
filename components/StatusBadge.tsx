'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem } from '@/lib/types';

/** Small badge on a saved card: "▶ ดูถึงตอนที่ 8" / "✓ ดูแล้ว" (nothing for plain "want"). */
export default function StatusBadge({ item }: { item: MediaItem }) {
  const { t } = useLanguage();
  if (!item.status || item.status === 'want') return null;

  const watched = item.status === 'watched';
  const label = watched
    ? `✓ ${t(item.type === 'music' ? 'status_listened' : 'status_watched')}`
    : item.progress_episode
      ? `▶ ${t('badge_watching_ep', { ep: item.progress_episode })}`
      : `▶ ${t('status_watching')}`;

  return (
    <span
      className={`absolute bottom-2 left-2 z-10 px-2 py-1 rounded-md text-sm font-bold ${
        watched ? 'bg-green-600/90 text-white' : 'bg-brand-600/90 text-white'
      }`}
    >
      {label}
    </span>
  );
}
