'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import MediaModal from '@/components/MediaModal';
import MusicModal from '@/components/MusicModal';
import SavedItemCard from '@/components/SavedItemCard';
import type { ProgressPatch } from '@/components/ProgressPanel';
import { useLanguage } from '@/context/LanguageContext';
import type { MediaItem } from '@/lib/types';
import type { TmdbResult } from '@/lib/tmdb';
import type { MusicTrack } from '@/lib/itunes';
import { useCollections } from '@/lib/useCollections';
import { useTmdbMatches, useSeriesSchedules, savedItemToResult, savedItemToTrack } from '@/lib/useTmdbMatches';

/** คอลเลกชัน — user-named groups of saved items ("ละครดูกับแม่", "เพลงขับรถ"). */
export default function CollectionsPage() {
  const { t } = useLanguage();
  const { collections, loading, reload, create, rename, remove, setMembership } = useCollections();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [preview, setPreview] = useState<TmdbResult | null>(null);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [song, setSong] = useState<MusicTrack | null>(null);
  const [songItemId, setSongItemId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/media')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMediaItems(data?.media ?? []))
      .catch(() => {});
  }, []);

  const matches = useTmdbMatches(mediaItems);
  const schedules = useSeriesSchedules(mediaItems, matches);
  const byId = new Map(mediaItems.map((m) => [m.id, m]));
  const selected = collections.find((c) => c.id === selectedId) ?? null;
  const previewItem = mediaItems.find((m) => m.id === previewItemId);

  const coverOf = (item: MediaItem | undefined) =>
    !item ? null : item.type === 'music' ? item.cover_url ?? null : matches[item.id]?.poster ?? item.cover_url ?? null;

  const openItem = (item: MediaItem) => {
    if (item.type === 'music') {
      setSong(savedItemToTrack(item));
      setSongItemId(item.id);
      return;
    }
    const match = matches[item.id];
    if (match) {
      setPreview(savedItemToResult(item, match));
      setPreviewItemId(item.id);
    }
  };

  const updateSaved = async (id: string, patch: ProgressPatch) => {
    const res = await fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.media) throw new Error(data.error || 'update failed');
    setMediaItems((items) => items.map((m) => (m.id === id ? { ...m, ...data.media } : m)));
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const created = await create(newName.trim());
      setNewName('');
      setCreating(false);
      setSelectedId(created.id);
    } catch (err) {
      alert(`${t('progress_error')}
(${err instanceof Error ? err.message : ''})`);
    } finally {
      setBusy(false);
    }
  };

  const renameSelected = async () => {
    if (!selected) return;
    const name = window.prompt(t('collections_rename_prompt'), selected.name);
    if (!name || !name.trim() || name.trim() === selected.name) return;
    try {
      await rename(selected.id, name.trim());
    } catch {
      alert(t('progress_error'));
    }
  };

  const deleteSelected = async () => {
    if (!selected) return;
    if (!window.confirm(t('collections_delete_confirm', { name: selected.name }))) return;
    try {
      await remove(selected.id);
      setSelectedId(null);
    } catch {
      alert(t('progress_error'));
    }
  };

  const removeFromSelected = async (itemId: string) => {
    if (!selected) return;
    setRemovingId(itemId);
    try {
      await setMembership(selected.id, itemId, false);
    } catch {
      alert(t('progress_error'));
    } finally {
      setRemovingId(null);
    }
  };

  // the preview's own collection box changes collections too — refresh when it closes
  const closePreview = () => {
    setPreview(null);
    setSong(null);
    reload();
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {!selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">🗂️ {t('nav_collections')}</h1>
              {!creating && (
                <button
                  onClick={() => setCreating(true)}
                  className="px-4 min-h-[48px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold"
                >
                  ➕ {t('collections_new')}
                </button>
              )}
            </div>
            <p className="text-base text-cinema-text-muted mb-5">{t('collections_intro')}</p>

            {creating && (
              <form onSubmit={submitNew} className="flex flex-wrap gap-2 mb-6">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={60}
                  placeholder={t('collections_name_placeholder')}
                  className="flex-1 min-w-[200px] px-4 min-h-[48px] rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder:text-cinema-text-muted focus:outline-none focus:border-brand-500"
                />
                <button type="submit" disabled={busy || !newName.trim()} className="px-5 min-h-[48px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold disabled:opacity-50">
                  {t('collections_create')}
                </button>
                <button type="button" onClick={() => { setCreating(false); setNewName(''); }} className="px-4 min-h-[48px] rounded-xl bg-white/5 text-cinema-text-muted hover:text-white">
                  {t('cancel')}
                </button>
              </form>
            )}

            {loading ? (
              <div className="imdb-grid">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-14 glass rounded-2xl border border-cinema-border">
                <div className="text-5xl mb-3">🗂️</div>
                <p className="text-lg text-white mb-2">{t('collections_none')}</p>
                <p className="text-base text-cinema-text-muted">{t('collections_empty_hint')}</p>
              </div>
            ) : (
              <div className="imdb-grid">
                {collections.map((c) => {
                  const covers = c.item_ids.map((id) => coverOf(byId.get(id))).filter(Boolean).slice(0, 4) as string[];
                  return (
                    <button key={c.id} type="button" onClick={() => setSelectedId(c.id)} className="imdb-card text-left">
                      <div className="aspect-square grid grid-cols-2 grid-rows-2 gap-0.5 bg-cinema-800 overflow-hidden">
                        {covers.length === 0 ? (
                          <div className="col-span-2 row-span-2 flex items-center justify-center text-5xl">🗂️</div>
                        ) : (
                          Array.from({ length: 4 }).map((_, i) =>
                            covers[i] ? (
                              <img key={i} src={covers[i]} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div key={i} className="bg-white/5" />
                            ),
                          )
                        )}
                      </div>
                      <div className="card-info">
                        <h3 className="card-title">{c.name}</h3>
                        <p className="text-base text-cinema-text-muted">{t('collections_count', { n: c.item_ids.length })}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setSelectedId(null)} className="mb-4 text-base text-brand-400 hover:text-brand-300">
              ← {t('collections_all')}
            </button>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <h1 className="text-2xl font-bold text-white">🗂️ {selected.name}</h1>
              <span className="text-base text-cinema-text-muted">{t('collections_count', { n: selected.item_ids.length })}</span>
              <div className="flex gap-2 ml-auto">
                <button onClick={renameSelected} className="px-4 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-base hover:bg-white/10">
                  ✏️ {t('collections_rename')}
                </button>
                <button onClick={deleteSelected} className="px-4 min-h-[44px] rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-base hover:bg-red-500/20">
                  🗑️ {t('collections_delete')}
                </button>
              </div>
            </div>

            {selected.item_ids.length === 0 ? (
              <div className="text-center py-14 glass rounded-2xl border border-cinema-border">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-base text-cinema-text-muted mb-4">{t('collections_items_empty')}</p>
                <Link href="/watchlist" className="inline-block px-5 min-h-[48px] leading-[48px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold">
                  🔖 {t('nav_watchlist')}
                </Link>
              </div>
            ) : (
              <div className="imdb-grid">
                {selected.item_ids.map((id) => {
                  const item = byId.get(id);
                  if (!item) return null;
                  const match = matches[item.id];
                  return (
                    <SavedItemCard
                      key={id}
                      item={item}
                      match={match}
                      schedule={match?.media === 'tv' ? schedules[match.tmdb_id] : null}
                      onOpen={() => openItem(item)}
                      action={{
                        label: t('collections_remove_item'),
                        icon: <span className="text-white/80 text-lg leading-none">✕</span>,
                        onClick: () => removeFromSelected(id),
                        busy: removingId === id,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {song && (
        <MusicModal
          track={song}
          isLoggedIn
          saved
          saving={false}
          onClose={closePreview}
          onToggleSave={closePreview}
          savedItemId={songItemId ?? undefined}
        />
      )}
      {preview && (
        <MediaModal
          result={preview}
          isLoggedIn
          saved
          saving={false}
          onClose={closePreview}
          onToggleSave={closePreview}
          savedItem={previewItem}
          onUpdateSaved={previewItem ? (patch) => updateSaved(previewItem.id, patch) : undefined}
        />
      )}
    </AppShell>
  );
}
