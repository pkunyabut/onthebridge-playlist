-- 0011: บทวิจารณ์จากนักวิจารณ์ (คัดย่อสั้นๆ + ลิงก์ไปต้นฉบับ) ที่ผู้ดูแลเว็บกรอกเอง
-- รันซ้ำได้ (IF NOT EXISTS / DROP POLICY IF EXISTS) · ให้กด New query ทุกครั้ง
--
-- อ่านได้ทุกคน (รวมคนที่ยังไม่ล็อกอิน) · เขียน/แก้/ลบได้เฉพาะผู้ดูแลเว็บ
-- ⚠️ อีเมลผู้ดูแลอยู่ 2 ที่: env ADMIN_EMAILS ใน Vercel (ให้ API ตรวจ) และกฎ RLS ด้านล่าง
--    ถ้าเปลี่ยนผู้ดูแล ต้องแก้ทั้งสองที่ (แก้อีเมลในไฟล์นี้แล้วรันซ้ำ)

create table if not exists public.critic_reviews (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  tmdb_media text not null check (tmdb_media in ('movie', 'tv')),
  title text,                                   -- ชื่อเรื่องตอนกรอก (ไว้ให้ผู้ดูแลอ่านในหน้าจัดการ)
  critic_name text not null,
  outlet text not null,
  quote text not null check (char_length(quote) between 1 and 300),
  rating text,                                  -- คะแนนที่นักวิจารณ์ให้ เช่น 4/5 (ไม่บังคับ)
  source_url text not null check (source_url ~* '^https?://'),
  published_at date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists critic_reviews_title_idx
  on public.critic_reviews (tmdb_media, tmdb_id);

alter table public.critic_reviews enable row level security;

drop policy if exists "critic_reviews_select_all" on public.critic_reviews;
create policy "critic_reviews_select_all" on public.critic_reviews
  for select to anon, authenticated using (true);

drop policy if exists "critic_reviews_admin_insert" on public.critic_reviews;
create policy "critic_reviews_admin_insert" on public.critic_reviews
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'pkunyabut@gmail.com');

drop policy if exists "critic_reviews_admin_update" on public.critic_reviews;
create policy "critic_reviews_admin_update" on public.critic_reviews
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'pkunyabut@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'pkunyabut@gmail.com');

drop policy if exists "critic_reviews_admin_delete" on public.critic_reviews;
create policy "critic_reviews_admin_delete" on public.critic_reviews
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'pkunyabut@gmail.com');

-- สิทธิ์ระดับตาราง (บทเรียน 0006: RLS อย่างเดียวไม่พอ ต้อง GRANT ด้วย)
grant select on public.critic_reviews to anon, authenticated;
grant insert, update, delete on public.critic_reviews to authenticated;

-- ===== เช็กผล (อ่านอย่างเดียว) — รันแยกใน New query แล้วส่งผลมาให้ดู =====
-- select policyname, cmd from pg_policies where tablename = 'critic_reviews' order by policyname;
--   ต้องได้ 4 แถว: admin_delete, admin_insert, admin_update, select_all
-- select column_name, data_type from information_schema.columns
--   where table_name = 'critic_reviews' order by ordinal_position;
