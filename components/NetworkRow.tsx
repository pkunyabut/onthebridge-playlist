'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { NETWORKS, getNetwork } from '@/lib/networks';
import type { TmdbRowItem } from '@/lib/tmdb';
import SuggestionRow from '@/components/SuggestionRow';

interface NetworkRowProps {
  /** TMDB content language (th-TH / en-US) */
  language: string;
  onSelect: (item: TmdbRowItem) => void;
}

/**
 * "ละครและซีรีส์ตามช่อง" — Thai channels and Asian platforms JustWatch doesn't cover,
 * listed by the network each show aired on (TMDB /discover/tv?with_networks=…).
 */
export default function NetworkRow({ language, onSelect }: NetworkRowProps) {
  const { t } = useLanguage();
  const [networkKey, setNetworkKey] = useState(NETWORKS[0].key);
  const [items, setItems] = useState<TmdbRowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);
    fetch(`/api/tmdb/rows?kind=network&network=${networkKey}&language=${language}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: TmdbRowItem[] } | null) => {
        if (requestId === requestRef.current) setItems(data?.items ?? []);
      })
      .catch(() => {
        if (requestId === requestRef.current) setItems([]);
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
  }, [networkKey, language]);

  const network = getNetwork(networkKey);

  return (
    <section className="max-w-7xl mx-auto px-4 pb-10">
      <div className="imdb-section-header">
        <h2>📺 {t('row_network_title')}</h2>
      </div>
      {/* own line: next to the heading it squeezed the title to 3 lines on phones */}
      <p className="-mt-2 mb-3 text-base text-cinema-text-muted">{t('row_network_hint')}</p>

      <div className="chip-row scrollbar-hide mb-4">
        {NETWORKS.map((n) => (
          <button
            key={n.key}
            onClick={() => setNetworkKey(n.key)}
            className={`chip ${networkKey === n.key ? 'active' : ''}`}
          >
            {t(`network_${n.key}`)}
          </button>
        ))}
      </div>

      <SuggestionRow
        title={t(`network_${networkKey}`)}
        hint={network ? t('network_watch_at', { app: network.app.name }) : undefined}
        items={items}
        loading={loading}
        onSelect={onSelect}
      />
    </section>
  );
}
