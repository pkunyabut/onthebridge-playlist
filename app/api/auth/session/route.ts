import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return NextResponse.json({ session: null, user: null }, { status: 401 });
  }

  return NextResponse.json({
    session: data.session,
    user: data.session.user,
  });
}
