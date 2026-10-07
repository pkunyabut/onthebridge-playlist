/**
 * Site owner check. ADMIN_EMAILS in Vercel is a comma-separated list; when it is not set,
 * nobody is an admin. (RLS on critic_reviews checks the email again in the database —
 * see supabase/migrations/0011_critic_reviews.sql.)
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}
