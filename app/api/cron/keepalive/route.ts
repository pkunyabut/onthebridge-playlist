import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET /api/cron/keepalive — run daily by Vercel Cron (vercel.json).
// Supabase Free pauses a project after 1 week without activity, which would break
// login and saving until someone presses "Restore". One tiny query a day keeps it awake.
// Only a row count is read; no user data leaves the database.
export async function GET(request: NextRequest) {
  // When CRON_SECRET is set in Vercel, Vercel Cron sends it as a Bearer token.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The public anon key is enough: SUPABASE_SERVICE_ROLE_KEY is not set in Vercel (checked 2026-09-26).
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Supabase env not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  // a plain 1-row select (a HEAD count returns no error body, so failures had no message)
  const { error, status } = await supabase.from('profiles').select('id').limit(1);

  // With the anon key Postgres answers "permission denied for table profiles" (42501) — the
  // table stays private, and the query still ran inside the database, which is all that is
  // needed to count as activity. Anything else (network, project paused, bad URL) is a failure.
  if (error && error.code === '42501') {
    return NextResponse.json({ ok: true, reached: 'database (anon role, table access denied as expected)', checked_at: new Date().toISOString() });
  }
  if (error) {
    const detail = { status, code: error.code, message: error.message, hint: error.hint };
    console.error('keepalive query failed:', JSON.stringify(detail));
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
  return NextResponse.json({ ok: true, checked_at: new Date().toISOString() });
}
