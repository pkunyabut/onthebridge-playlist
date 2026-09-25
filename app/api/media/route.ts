import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { isValidMediaType, isValidPlatform, PLATFORM_TYPES } from '@/lib/types';

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
    return `แพลตฟอร์มไม่ถูกต้อง (รองรับ: ${PLATFORM_TYPES.join(', ')})`;
  }
  return null;
}

const text = (v: unknown, max = 500): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const httpsUrl = (v: unknown): string | null => {
  const s = text(v, 1000);
  return s && s.startsWith('https://') ? s : null;
};
const positiveInt = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;

/**
 * Optional columns from migration 0007 (songs from iTunes, exact TMDb ids for movies/series).
 * Only non-empty values are sent, so plain manual entries insert exactly as before.
 */
function extraColumns(body: Record<string, unknown>): Record<string, string | number> {
  const extra: Record<string, string | number | null> = {
    artist: text(body.artist, 300),
    album: text(body.album, 300),
    cover_url: httpsUrl(body.cover_url),
    external_url: httpsUrl(body.external_url),
    itunes_track_id: positiveInt(body.itunes_track_id),
    tmdb_id: positiveInt(body.tmdb_id),
    tmdb_media: body.tmdb_media === 'movie' || body.tmdb_media === 'tv' ? body.tmdb_media : null,
  };
  return Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== null)) as Record<string, string | number>;
}

/**
 * PostgREST error when a column doesn't exist yet (e.g. migration 0007 not run):
 * "Could not find the 'cover_url' column of 'media_items' in the schema cache".
 * Saving then retries with only the original columns, so users never see that error.
 */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === 'PGRST204' || /Could not find the '.+' column/.test(error.message ?? ''));
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

  const baseRow = {
    user_id: session.user.id,
    title,
    type,
    platform,
    genre: genre || null,
    year: year || null,
    notes: notes || null,
  };
  let { data, error } = await supabase
    .from('media_items')
    .insert({ ...baseRow, ...extraColumns(body) })
    .select()
    .single();
  if (isMissingColumn(error)) {
    console.warn('media_items is missing optional columns (run migration 0007):', error?.message);
    ({ data, error } = await supabase.from('media_items').insert(baseRow).select().single());
  }

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

  const baseUpdate = {
    title,
    type,
    platform,
    genre: genre || null,
    year: year || null,
    notes: notes || null,
  };
  let { data, error } = await supabase
    .from('media_items')
    .update({ ...baseUpdate, ...extraColumns(body) })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select()
    .single();
  if (isMissingColumn(error)) {
    ({ data, error } = await supabase
      .from('media_items')
      .update(baseUpdate)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ media: data });
}
