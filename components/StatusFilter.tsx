'use client';

import { useLanguage } from '@/context/LanguageContext';
import type { WatchStatus } from '@/lib/types';

const OPTIONS: ('all' | WatchStatus)[] = ['all', 'want', 'watching', 'watched'];

/** Chips: any status / want / watching / watched — narrows the saved-items grid. */
export default function StatusFilter({
  value,
  onChange,
}: {
  value: 'all' | WatchStatus;
  onChange: (v: 'all' | WatchStatus) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="chip-row scrollbar-hide mb-5" role="group" aria-label={t('my_progress')}>
      {OPTIONS.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`chip ${value === o ? 'active' : ''}`}>
          {o === 'all' ? t('status_filter_all') : t(`status_${o}`)}
        </button>
      ))}
    </div>
  );
}
