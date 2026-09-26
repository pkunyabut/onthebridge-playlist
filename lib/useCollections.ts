'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Collection } from '@/app/api/collections/route';

/** The signed-in user's collections (คอลเลกชัน) plus helpers to create / change them. */
export function useCollections(enabled = true) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      const data = res.ok ? await res.json() : null;
      setCollections(data?.collections ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const create = async (name: string, description?: string): Promise<Collection> => {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.collection) throw new Error(data.error || 'create failed');
    setCollections((prev) => [data.collection, ...prev]);
    return data.collection;
  };

  const rename = async (id: string, name: string) => {
    const res = await fetch('/api/collections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.collection) throw new Error(data.error || 'rename failed');
    setCollections((prev) => prev.map((c) => (c.id === id ? data.collection : c)));
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('delete failed');
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  /** add / remove one saved item (optimistic; rolls back on failure) */
  const setMembership = async (collectionId: string, mediaItemId: string, member: boolean) => {
    const apply = (on: boolean) =>
      setCollections((prev) =>
        prev.map((c) =>
          c.id !== collectionId
            ? c
            : { ...c, item_ids: on ? Array.from(new Set([...c.item_ids, mediaItemId])) : c.item_ids.filter((x) => x !== mediaItemId) },
        ),
      );
    apply(member);
    const res = member
      ? await fetch('/api/collections/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection_id: collectionId, media_item_id: mediaItemId }),
        })
      : await fetch(`/api/collections/items?collection_id=${collectionId}&media_item_id=${mediaItemId}`, { method: 'DELETE' });
    if (!res.ok) {
      apply(!member);
      throw new Error('update failed');
    }
  };

  return { collections, loading, reload, create, rename, remove, setMembership };
}
