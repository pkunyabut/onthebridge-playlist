import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { syncAllTmdb } from '@/lib/tmdb-sync';

export const dynamic = 'force-dynamic';

/**
 * Only the site owner may run a TMDB sync (heavy, writes cache tables). ADMIN_EMAILS in
 * Vercel is a comma-separated list; when it is not set, nobody can run it.
 */
function isAdmin(email: string | undefined): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}

// POST /api/sync — trigger TMDb sync into Supabase cache tables
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'เฉพาะผู้ดูแลเว็บเท่านั้น' }, { status: 403 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  try {
    const results = await syncAllTmdb(apiKey);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('TMDb sync error:', err);
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/sync/status — check how many items are cached
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'เฉพาะผู้ดูแลเว็บเท่านั้น' }, { status: 403 });
  }

  const tables = ['tmdb_movies', 'tmdb_tv', 'tmdb_documentaries', 'tmdb_music'];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    counts[table] = count ?? 0;
  }

  return NextResponse.json({ counts });
}
