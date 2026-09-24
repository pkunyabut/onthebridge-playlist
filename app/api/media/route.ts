import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { isValidMediaType, isValidPlatform } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Validate the fields that the media_items CHECK constraints enforce, so the caller gets
 * a readable 400 instead of a raw Postgres constraint violation.
 */
function validateMediaPayload(body: { title?: unknown; type?: unknown; platform?: unknown }): string | null {
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return 'กรุณากรอกชื่อรายการ';
  }
  if (!isValidMediaType(body.type)) {
    return `ประเภทรายการไม่ถูกต้อง (รองรับ: movie, series, documentary, talkshow, music, news)`;
  }
  if (!isValidPlatform(body.platform)) {
    return `แพลตฟอร์มไม่ถูกต้อง (รองรับ: netflix, disney, hbo, prime, youtube, spotify, apple_music, wetv, viu, iqiyi, youku, other)`;
  }
  return null;
}

// GET /api/media — list all media items for current user
export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data });
}

// POST /api/media — create a new media item
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, type, platform, genre, year, notes } = body;

  const validationError = validateMediaPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('media_items')
    .insert({
      user_id: session.user.id,
      title,
      type,
      platform,
      genre: genre || null,
      year: year || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data }, { status: 201 });
}

// DELETE /api/media — delete a media item
export async function DELETE(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PUT /api/media — update a media item
export async function PUT(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, type, platform, genre, year, notes } = body;

  if (!id) {
    return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });
  }

  const validationError = validateMediaPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('media_items')
    .update({
      title,
      type,
      platform,
      genre: genre || null,
      year: year || null,
      notes: notes || null,
    })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data });
}
