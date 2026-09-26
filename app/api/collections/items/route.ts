import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getClient() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session };
}

// POST /api/collections/items — { collection_id, media_item_id } → add a saved item to a collection
export async function POST(request: NextRequest) {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const collectionId = typeof body.collection_id === 'string' ? body.collection_id : '';
  const mediaItemId = typeof body.media_item_id === 'string' ? body.media_item_id : '';
  if (!collectionId || !mediaItemId) {
    return NextResponse.json({ error: 'ต้องระบุคอลเลกชันและรายการ' }, { status: 400 });
  }

  // both must belong to this user (RLS on playlist_items only checks the collection)
  const [{ data: collection }, { data: item }] = await Promise.all([
    supabase.from('playlists').select('id').eq('id', collectionId).eq('user_id', session.user.id).maybeSingle(),
    supabase.from('media_items').select('id').eq('id', mediaItemId).eq('user_id', session.user.id).maybeSingle(),
  ]);
  if (!collection || !item) {
    return NextResponse.json({ error: 'ไม่พบคอลเลกชันหรือรายการนี้' }, { status: 404 });
  }

  const { count } = await supabase
    .from('playlist_items')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', collectionId);

  const { error } = await supabase
    .from('playlist_items')
    .insert({ playlist_id: collectionId, media_item_id: mediaItemId, position: count ?? 0 });

  // 23505 = already in this collection (UNIQUE playlist_id + media_item_id) — treat as success
  if (error && error.code !== '23505') {
    console.error('collections items API error:', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint }));
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/collections/items?collection_id=…&media_item_id=… — remove from the collection only
export async function DELETE(request: NextRequest) {
  const { supabase, session } = await getClient();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const collectionId = params.get('collection_id');
  const mediaItemId = params.get('media_item_id');
  if (!collectionId || !mediaItemId) {
    return NextResponse.json({ error: 'ต้องระบุคอลเลกชันและรายการ' }, { status: 400 });
  }

  const { error } = await supabase
    .from('playlist_items')
    .delete()
    .eq('playlist_id', collectionId)
    .eq('media_item_id', mediaItemId);

  if (error) {
    console.error('collections API error:', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint }));
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
