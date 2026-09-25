-- OnTheBridge Playlist — แก้ข้อ 1: "Could not save: permission denied for table media_items"
-- รันไฟล์นี้ทั้งไฟล์ใน Supabase → SQL Editor ครั้งเดียว (รันซ้ำได้ ไม่เสียหาย)
--
-- สาเหตุ 1: role "authenticated" (ผู้ใช้ที่ล็อกอินแล้ว) ยังไม่ได้รับสิทธิ์เขียนตาราง
--           → Postgres ตอบ "permission denied" ก่อนจะถึงขั้นตรวจ RLS ด้วยซ้ำ
-- สาเหตุ 2: media_items.user_id อ้างอิง profiles(id) แต่ไม่มีโค้ดไหนสร้างแถวใน profiles
--           → พอแก้สาเหตุ 1 แล้ว จะเจอ error "violates foreign key constraint" ต่อทันที
-- กฎ RLS เดิม (0002_rls.sql) ถูกต้องอยู่แล้ว ไม่ต้องแก้

BEGIN;

-- ---------- สาเหตุ 1: ให้สิทธิ์ผู้ใช้ที่ล็อกอิน (RLS ยังคุมให้เห็น/แก้ได้เฉพาะของตัวเอง) ----------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.profiles       TO authenticated;

-- ---------- สาเหตุ 2: สร้าง profile ให้ผู้ใช้ใหม่อัตโนมัติเมื่อสมัคร ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- เติม profile ให้ผู้ใช้ที่สมัครไว้แล้ว (รวมบัญชีพี่แอ้)
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ---------- ตรวจผล: ทั้งสองแถวควรได้ตัวเลขเท่ากัน ----------
SELECT
  (SELECT count(*) FROM auth.users)      AS users,
  (SELECT count(*) FROM public.profiles) AS profiles;
