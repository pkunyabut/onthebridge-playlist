'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { CriticReview } from '@/lib/critic-reviews';

interface CriticReviewsProps {
  tmdbId: number | string;
  media: 'movie' | 'tv';
}

/**
 * Short critic quotes the site owner picked (table critic_reviews), each with the critic, the
 * outlet and a link to the full original review. Renders nothing while loading, on any error,
 * or when the title has no reviews — the preview never shows a gap.
 */
export default function CriticReviews({ tmdbId, media }: CriticReviewsProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<CriticReview[]>([]);

  useEffect(() => {
    setReviews([]);
    if (!/^\d+$/.test(String(tmdbId))) return;
    let cancelled = false;
    fetch(`/api/critic-reviews?tmdb_id=${tmdbId}&media=${media}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reviews?: CriticReview[] } | null) => {
        if (!cancelled) setReviews(data?.reviews ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tmdbId, media]);

  if (reviews.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-xl border bg-white/5 border-white/10">
      <p className="font-semibold text-white text-base mb-2">{t('critic_reviews_title')}</p>
      <div className="space-y-4">
        {reviews.map((r) => (
          <figure key={r.id} className="border-l-2 border-brand-500/60 pl-3">
            <blockquote className="text-base text-white/90 leading-relaxed">&ldquo;{r.quote}&rdquo;</blockquote>
            <figcaption className="text-sm text-cinema-text-muted mt-1">
              <span className="text-white">{r.critic_name}</span> · {r.outlet}
              {r.rating ? ` · ${r.rating}` : ''}
            </figcaption>
            <a
              href={r.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2 min-h-[32px]"
            >
              {t('critic_reviews_read_full')}
            </a>
          </figure>
        ))}
      </div>
      <p className="text-sm text-cinema-text-muted/80 mt-3">{t('critic_reviews_note')}</p>
    </div>
  );
}
