import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { REVIEW_COLUMNS, parseReviewInput, type CriticReview } from '@/lib/critic-reviews';

export const dynamic = 'force-dynamic';

// Critic reviews: short quotes + a link to the original, entered by the site owner.
//   GET    ?tmdb_id=&media=movie|tv → public, reviews of one title (newest first)
//   GET    ?recent=1                → admin only, latest 50 across all titles
//   POST / PATCH / DELETE           → admin only (ADMIN_EMAILS here + RLS in the database)

const NO_STORE = { 'Cache-Control': 'no-store' };
const PUBLIC_CACHE = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };

async function getClient() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session };
}

function fail(error: { code?: string; message: string; details?: string; hint?: string }) {
  console.error('critic-reviews API error:', JSON.stringify({ code: error.code, message: error.message, details: error.details, hint: error.hint }));
  // 42P01 = table does not exist → the owner has not run SQL 0011 yet
  if (error.code === '42P01') {
    return NextResponse.json({ error: 'ต้องรัน SQL 0011 ก่อน', code: error.code }, { status: 503 });
  }
  return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
}

async function requireAdmin() {
  const { supabase, session } = await getClient();
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  if (!isAdminEmail(session.user.email)) {
    return { error: NextResponse.json({ error: 'เฉพาะผู้ดูแลเว็บเท่านั้น' }, { status: 403 }) } as const;
  }
  return { supabase, session } as const;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;

  if (params.get('recent')) {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const { data, error } = await auth.supabase
      .from('critic_reviews')
      .select(REVIEW_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return fail(error);
    return NextResponse.json({ reviews: data as CriticReview[] }, { headers: NO_STORE });
  }

  const tmdbId = Number(params.get('tmdb_id'));
  const media = params.get('media');
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || (media !== 'movie' && media !== 'tv')) {
    return NextResponse.json({ error: 'tmdb_id หรือ media ไม่ถูกต้อง' }, { status: 400 });
  }

  const { supabase } = await getClient();
  const { data, error } = await supabase
    .from('critic_reviews')
    .select(REVIEW_COLUMNS)
    .eq('tmdb_id', tmdbId)
    .eq('tmdb_media', media)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  // the preview card must never break because of this feature → any failure reads as "no reviews"
  if (error) {
    console.error('critic-reviews public read failed:', error.code, error.message);
    return NextResponse.json({ reviews: [] });
  }
  return NextResponse.json({ reviews: data as CriticReview[] }, { headers: PUBLIC_CACHE });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseReviewInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await auth.supabase
    .from('critic_reviews')
    .insert({ ...parsed.value, created_by: auth.session.user.id })
    .select(REVIEW_COLUMNS)
    .single();
  if (error) return fail(error);
  return NextResponse.json({ review: data as CriticReview }, { status: 201 });
}

// PATCH { id, ...all fields } — replaces the editable fields of one review
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });
  }
  const parsed = parseReviewInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await auth.supabase
    .from('critic_reviews')
    .update(parsed.value)
    .eq('id', body.id)
    .select(REVIEW_COLUMNS)
    .single();
  if (error) return fail(error);
  return NextResponse.json({ review: data as CriticReview });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ต้องระบุ ID' }, { status: 400 });

  const { error } = await auth.supabase.from('critic_reviews').delete().eq('id', id);
  if (error) return fail(error);
  return NextResponse.json({ success: true });
}
