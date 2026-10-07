'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { CriticScores as Scores } from '@/lib/omdb';

interface CriticScoresProps {
  imdbId: string | null | undefined;
}

/**
 * Critic scores (Rotten Tomatoes, Metacritic) via OMDb. Renders nothing while loading, when
 * the title has no scores, or when OMDB_API_KEY is not set — the preview never shows a gap.
 */
export default function CriticScores({ imdbId }: CriticScoresProps) {
  const { t } = useLanguage();
  const [scores, setScores] = useState<Scores | null>(null);

  useEffect(() => {
    setScores(null);
    if (!imdbId) return;
    let cancelled = false;
    fetch(`/api/ratings?imdb=${imdbId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scores?: Scores | null } | null) => {
        if (!cancelled) setScores(data?.scores ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  if (!scores) return null;

  const items = [
    { key: 'rt', icon: '\u{1F345}', label: 'Rotten Tomatoes', value: scores.rotten_tomatoes },
    { key: 'mc', icon: '\u24C2\uFE0F', label: 'Metacritic', value: scores.metacritic },
  ].filter((i) => i.value);

  return (
    <div className="mb-4 p-3 rounded-xl border bg-white/5 border-white/10">
      <p className="font-semibold text-white text-base mb-2">{t('critic_scores_title')}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {items.map((i) => (
          <div key={i.key}>
            <p className="text-xl font-bold text-white">
              <span aria-hidden="true">{i.icon}</span> {i.value}
            </p>
            <p className="text-sm text-cinema-text-muted">{i.label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-cinema-text-muted/80 mt-2">{t('critic_scores_credit')}</p>
    </div>
  );
}
