'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Shown in place of the "แนะนำสำหรับคุณ" row when we have nothing personal to recommend yet
 * (logged out, empty watchlist, or saved titles TMDb couldn't match) — instead of repeating
 * the trending row under a misleading heading.
 */
export default function ForYouInvite({ isLoggedIn, savedCount }: { isLoggedIn: boolean; savedCount: number }) {
  const { t } = useLanguage();
  const message = savedCount > 0 ? t('for_you_invite_nomatch') : t('for_you_invite_empty');

  return (
    <div className="mb-8">
      <div className="imdb-section-header">
        <h2>✨ {t('row_for_you')}</h2>
      </div>
      <div className="rounded-xl border border-dashed border-cinema-border bg-white/[0.03] px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="flex-1 text-base text-cinema-text leading-relaxed">{message}</p>
        {isLoggedIn ? (
          <a
            href="#browse"
            className="min-h-[48px] inline-flex items-center justify-center px-5 py-3 bg-white/5 border border-white/10 text-cinema-text rounded-lg font-medium text-base transition-colors hover:bg-white/10"
          >
            👇 {t('for_you_invite_browse')}
          </a>
        ) : (
          <Link
            href="/login"
            className="min-h-[48px] inline-flex items-center justify-center px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-base transition-colors shadow-gold"
          >
            {t('cta_start_free')}
          </Link>
        )}
      </div>
    </div>
  );
}
