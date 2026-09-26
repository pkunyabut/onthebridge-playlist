'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useCollections } from '@/lib/useCollections';

/**
 * "🗂️ Collections" box inside the preview of a saved item: tap a collection to add / remove
 * the item, or create a new collection (the item goes straight into it).
 */
export default function CollectionPicker({ mediaItemId }: { mediaItemId: string }) {
  const { t } = useLanguage();
  const { collections, loading, create, setMembership } = useCollections();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | false>(false);

  const toggle = async (collectionId: string, member: boolean) => {
    setError(false);
    try {
      await setMembership(collectionId, mediaItemId, member);
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    }
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const created = await create(name.trim());
      await setMembership(created.id, mediaItemId, true);
      setName('');
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-base font-semibold text-white">🗂️ {t('collections_add_title')}</p>
        <Link href="/collections" className="text-sm text-brand-400 hover:text-brand-300 underline underline-offset-2">
          {t('collections_manage')}
        </Link>
      </div>

      {loading ? (
        <div className="h-10 rounded-xl bg-white/10 animate-pulse" aria-label={t('loading')} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => {
            const member = c.item_ids.includes(mediaItemId);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id, !member)}
                aria-pressed={member}
                className={`min-h-[44px] px-3 rounded-xl text-base font-medium transition-colors ${
                  member ? 'bg-brand-600 text-white' : 'bg-white/5 text-cinema-text hover:bg-white/10 border border-white/10'
                }`}
              >
                {member ? '✓ ' : ''}
                {c.name}
              </button>
            );
          })}
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="min-h-[44px] px-3 rounded-xl text-base font-medium border border-dashed border-white/30 text-cinema-text-muted hover:text-white hover:border-white/60"
            >
              ➕ {t('collections_new')}
            </button>
          )}
        </div>
      )}

      {creating && (
        <form onSubmit={submitNew} className="flex gap-2 mt-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t('collections_name_placeholder')}
            className="flex-1 min-w-0 px-3 min-h-[44px] rounded-xl bg-black/30 border border-white/10 text-white text-base placeholder:text-cinema-text-muted/70 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold disabled:opacity-50"
          >
            {t('collections_create')}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setName('');
            }}
            className="px-3 min-h-[44px] rounded-xl bg-white/5 text-cinema-text-muted hover:text-white"
            aria-label={t('close')}
          >
            ✕
          </button>
        </form>
      )}

      {!loading && collections.length === 0 && !creating && (
        <p className="mt-2 text-sm text-cinema-text-muted">{t('collections_empty_hint')}</p>
      )}
      {error !== false && (
        <p className="mt-2 text-base text-red-400">
          {t('progress_error')}
          {error && <span className="block text-sm text-red-300/80">({error})</span>}
        </p>
      )}
    </div>
  );
}
