import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// "Collections" (คอลเลกชัน) — user-named groups of saved items. Stored in the `playlists` /
// `playlist_items` tables (internal names; the site never says "playlist"). RLS limits every
// query to the signed-in user's own rows.

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  /** media_items ids in this collection, in order */
  item_ids: string[];
}

interface RawCollection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  playlist_items?: { media_item_id: string; position: number | null }[];
}

const MAX_NAME = 60;
const MAX_DESCRIPTION = 300;

async function getClient() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session };
}

function toCollection(raw: RawCollection): Collection {
  const items = [...(raw.playlist_items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    created_at: raw.created_at,
    item_ids: items.map((i) => i.media_item_id),
  };
}

function cleanName(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX_NAME) : null;
}

function cleanDescription(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX_DESCRIPTION) : null;
}

const SELECT = 'id, name, description, created_at, playlist_items(media_item_id, position)';

// GET /api/collections — the user's collections (newest first) with their item ids
export async function GET() {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('playlists')
    .select(SELECT)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: (data as RawCollection[]).map(toCollection) });
}

// POST /api/collections — { name, description? } → new collection
export async function POST(request: NextRequest) {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanName(body.name);
  if (!name) return NextResponse.json({ error: 'กรุณาตั้งชื่อคอลเลกชัน' }, { status: 400 });

  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: session.user.id, name, description: cleanDescription(body.description) })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: toCollection(data as RawCollection) }, { status: 201 });
}

// PATCH /api/collections — { id, name?, description? } → rename / edit
export async function PATCH(request: NextRequest) {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });
  }
  const update: Record<string, string | null> = {};
  if ('name' in body) {
    const name = cleanName(body.name);
    if (!name) return NextResponse.json({ error: 'กรุณาตั้งชื่อคอลเลกชัน' }, { status: 400 });
    update.name = name;
  }
  if ('description' in body) update.description = cleanDescription(body.description);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลให้แก้ไข' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('playlists')
    .update(update)
    .eq('id', body.id)
    .eq('user_id', session.user.id)
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: toCollection(data as RawCollection) });
}

// DELETE /api/collections?id=… — deletes the collection only (saved items stay in the watchlist)
export async function DELETE(request: NextRequest) {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });

  // remove its item links first (in case the foreign key has no ON DELETE CASCADE)
  await supabase.from('playlist_items').delete().eq('playlist_id', id);
  const { error } = await supabase.from('playlists').delete().eq('id', id).eq('user_id', session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
