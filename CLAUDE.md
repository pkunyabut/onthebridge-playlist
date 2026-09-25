# OnTheBridge Playlist — คู่มือโปรเจกต์สำหรับ Claude Code

> เจ้าของ: พี่แอ้ (พนธกร กัญญาบุตร) — ตอบเป็นภาษาไทยเสมอ อธิบายแบบไม่ใช้ศัพท์เทคนิคเกินจำเป็น
> อัปเดตล่าสุด: 25 ก.ย. 2569 — ย้ายงานจาก Hermes (ไนเจล) มาทำกับ Claude Code โดยตรงแล้ว
> ไฟล์นี้คือแหล่งข้อมูลหลัก ถ้าขัดกับ `.claude/instructions.md`, `.claude/task-prompt.md`, `FIXES_ROUND1.md`, `RLS_FIX.md` ให้ยึดไฟล์นี้ (ไฟล์เหล่านั้นเป็นของรอบ Hermes และบางส่วนล้าสมัย/ผิด)

## กติกาการทำงาน (สำคัญที่สุด)
1. **"เสร็จ" = มีหลักฐานว่าใช้งานได้จริง** — ต้อง `npm run build` ผ่าน และทดสอบฟีเจอร์จริง (บนเว็บ/เครื่อง) พร้อมบอกผลที่เห็น ห้ามรายงานว่าเสร็จจากการเดา
2. **วินิจฉัยจาก error ตัวจริง** — อ่านข้อความ error ให้ครบก่อนสรุปสาเหตุ (บทเรียน: "permission denied" ≠ ปัญหา RLS)
3. อย่าแก้ไฟล์บทความ รูปภาพ หรือไฟล์เสียง ห้ามเพิ่ม npm dependency โดยไม่ถามพี่แอ้
4. ใช้ได้ฟรีเท่านั้น (free tier ทุกบริการ) และรองรับมือถือ 360/390/430px
5. กลุ่มผู้ใช้หลักวัย 25–65+ → ต้องใช้ง่ายสำหรับทุกวัย: ตัวหนังสือใหญ่ อ่านง่าย ปุ่มกดง่าย (เผื่อผู้ใช้สูงวัย) แต่หน้าตาต้องทันสมัย ไม่ดูเชย (เผื่อผู้ใช้วัยทำงาน)
6. ห้าม commit ไฟล์ `.env*` / คีย์ลับ

## ภาพรวม
- เว็บจัดรายการ "รอดู" หนัง ซีรีส์ สารคดี (และเพลง) ข้ามแพลตฟอร์ม — เก็บแค่ข้อมูล ไม่เล่นวิดีโอ
- เว็บจริง: https://onthebridge-playlist.vercel.app
- GitHub: https://github.com/pkunyabut/onthebridge-playlist (branch `main`)
- Vercel project: `onthebridge-playlist`
- Supabase project: `onthebridge-playlist` (ref `jjxkwytngfjjhhrghakk`, แพ็กเกจ Free)

## เทคโนโลยี
Next.js 14 (App Router) + TypeScript + Tailwind · Supabase (Postgres + Auth แบบ Google) · TMDb API (ข้อมูลหนัง) · Vercel

### Environment variables (ตั้งใน Vercel)
| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | เชื่อม Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | เขียนตาราง cache ของ TMDb (ฝั่งเซิร์ฟเวอร์เท่านั้น) |
| `TMDB_API_KEY` | ดึงข้อมูลหนัง |
| `NEXT_PUBLIC_SITE_URL` | URL สำหรับ redirect หลังล็อกอิน Google |
| `GEMINI_API_KEY` | ปุ่ม AI |
| `GEMINI_MODEL` (ไม่บังคับ) | บังคับรุ่น Gemini ถ้าไม่ตั้งจะใช้ `gemini-flash-latest` |

## โครงสร้างหลัก
- `app/page.tsx` — หน้าแรก (browse แบบ JustWatch): แท็บ ภาพยนตร์/ซีรีส์/สารคดี/เพลง, สลับ สตรีมมิ่ง/ในโรง, กรองแนว, เลือกแพลตฟอร์มของฉัน, แถว กำลังมาแรง/คะแนนสูงสุด/แนะนำสำหรับคุณ/ไทยและเอเชีย
- `app/search`, `app/watchlist` (หน้า "รอดู"), `app/dashboard`, `app/dashboard/add`, `app/login`
- `app/api/media` — CRUD รายการของผู้ใช้ (ตาราง `media_items`)
- `app/api/tmdb/*` — popular, rows (แถวแนะนำ ใช้ TMDb recommendations ไม่ใช่ AI), genres, providers, search
- `app/api/ai/*` + `lib/gemini.ts` — ปุ่ม AI แนะนำหนัง (Gemini)
- `app/api/sync` — ดึงข้อมูล TMDb ลงตาราง cache
- `components/` — MediaCard, MediaModal, ServicePicker, SuggestionRow, AppShell, CardSkeleton
- `lib/` — tmdb*, supabase, types, i18n (th/en)
- `middleware.ts` — กันหน้า /dashboard /search /watchlist ต้องล็อกอิน

## ฐานข้อมูล (supabase/migrations)
| ไฟล์ | สถานะ |
|---|---|
| 0001_init, 0002_rls | ตาราง profiles, media_items, playlists, playlist_items + RLS (ถูกต้องแล้ว ห้ามรันซ้ำ — จะ error "policy already exists") |
| 0003_tmdb_cache | ตาราง cache ของ TMDb |
| 0004, 0005 | ขยายรายการ platform/type (wetv, viu, iqiyi, youku) |
| **0006_fix_save_permissions** | ✅ รันแล้ว 25 ก.ย. 69 — GRANT สิทธิ์ให้ role `authenticated` + trigger สร้าง `profiles` อัตโนมัติ (ผล: users 2 = profiles 2) |

`media_items.user_id` อ้างอิง `profiles(id)` → ผู้ใช้ทุกคนต้องมีแถวใน profiles (trigger `on_auth_user_created` จัดการให้แล้ว)

## ✅ งานที่เสร็จแล้ว (ชุดคำสั่ง 8 ข้อของพี่แอ้)
1. บันทึกรายการได้ — แก้ด้วย 0006 ทดสอบผ่านบนเว็บจริงแล้ว
2. ขยายตัวหนังสือ (root 17px)
3. แยกหมวด ภาพยนตร์/ซีรีส์/สารคดี + กรองแนว
4. "เลือกแพลตฟอร์มของฉัน" (ServicePicker)
5. แยก สตรีมมิ่ง / ในโรงภาพยนตร์
6. แถวแนะนำ (แนะนำสำหรับคุณ อิงรายการที่บันทึก)
7. แถวหนังไทยและเอเชีย (ไทย เกาหลี ญี่ปุ่น จีน ฮ่องกง ไต้หวัน อินเดีย)
8. หลัก Critical Thinking → กลายเป็น "กติกาการทำงาน" ด้านบน

## 🤖 ปุ่ม AI (Gemini) — แก้โค้ดแล้ว รอ deploy
- 25 ก.ย. 69: พี่แอ้เลือกใช้ Gemini ต่อ ใส่คีย์ใหม่ใน Vercel แล้ว (Secret, All Environments) และมีสำเนาใน `.env.local`
- โค้ดเดิมเรียก `gemini-2.0-flash` ที่ Google ปิดแล้ว (1 มิ.ย. 2026) → 404
- แก้แล้ว: ทุกจุดเรียกผ่าน `lib/gemini.ts` ที่เดียว ใช้ `gemini-flash-latest` สำรองด้วย `gemini-flash-lite-latest` (สลับเองเมื่อ 404/429/5xx) ส่งคีย์ทาง header, เพิ่ม maxOutputTokens เผื่อรุ่นที่ "คิด" ก่อนตอบ, ขอคำตอบเป็น JSON
- เปลี่ยนรุ่นได้โดยตั้ง env `GEMINI_MODEL` ใน Vercel ไม่ต้องแก้โค้ด
- `npm run build` ผ่านแล้ว แต่ **ยังไม่ได้ทดสอบกับ Google จริง** — หลัง deploy ให้เปิด `/api/ai/recommend` (GET) ต้องได้ `"working": true` แล้วลองปุ่ม AI ในหน้า dashboard

## 🐞 แก้หน้า Dashboard (25 ก.ย. 69) — รอ commit + deploy
- อาการ: กดปุ่ม AI ขึ้น "Add items to your watchlist…" ทั้งที่บันทึกรายการไว้แล้ว
- สาเหตุ: `app/dashboard/page.tsx` และ `app/dashboard/add/page.tsx` เช็ก session ด้วย `lib/supabase-browser` (client ธรรมดา อ่าน localStorage) แต่ระบบล็อกอินเก็บ session ใน cookie → ได้ null เสมอ ฟังก์ชันจบก่อนเรียก API รายการใน Dashboard จึงว่าง และฟอร์มเพิ่มรายการเองก็บันทึกไม่ได้
- แก้: เรียก `/api/media` ตรงๆ (API อ่าน cookie เอง) เหมือนหน้า watchlist — build ผ่านแล้ว
- ทดสอบหลัง deploy: หน้า Dashboard ต้องเห็นรายการที่บันทึก, ปุ่ม AI ต้องได้คำแนะนำภาษาไทย, ฟอร์ม /dashboard/add ต้องบันทึกได้
- ข้อควรระวัง: ห้ามใช้ `supabase.auth.getSession()` จาก `lib/supabase-browser` เพื่อเช็กการล็อกอินในหน้าเว็บ

## 🎬 หน้าต่าง Preview ของการ์ด (25 ก.ย. 69) — ✅ deploy และทดสอบบนเว็บจริงแล้ว
- คลิกการ์ดแล้วหน้าต่างขึ้นอยู่แล้ว แต่ข้อมูลน้อย → เพิ่ม `app/api/tmdb/details` (TMDb details + credits + videos + watch/providers ของไทย, cache 6 ชม.) และ `components/MediaModal.tsx` ดึงมาแสดงตอนเปิด
- แสดง: ความยาว/จำนวนซีซัน, แนว, ปุ่ม "▶ ดูตัวอย่าง" (YouTube ฝังในหน้าต่าง เลือกคลิปไทยก่อน), เรื่องย่อไทย (ไม่มี→อังกฤษ), ผู้กำกับ/ผู้สร้าง, นักแสดง 5 คน (ชื่อที่ไม่ใช่อักษรไทย/ละติน เช่น จีน เกาหลี จะใช้ชื่ออังกฤษ), "ดูได้ที่ไหนในไทย" จากข้อมูลจริง + ลิงก์หน้า watch ของ TMDb
- `TMDB_API_KEY` ตั้งใน Vercel เฉพาะ Production และไม่มีใน `.env.local` → ทดสอบ API นี้ในเครื่องหรือบน Preview ไม่ได้

## 🧹 แก้จุดเล็ก 3 ข้อ (25 ก.ย. 69) — ✅ deploy และทดสอบบนเว็บจริงแล้ว
- **โควตา AI:** GET `/api/ai` และ `/api/ai/recommend` (ใครก็เปิดได้) ใช้ `checkGeminiHealth()` ใน `lib/gemini.ts` ที่จำผล 10 นาที (ถ้าล้มเหลวจำ 1 นาที) → ไม่ถาม Google ทุกครั้ง; ผลมี `checked_at` บอกเวลาที่ถามจริง
- **หน้าแรก:** ลบข้อความ `discover/movie?with_origin_country=…` ที่หลุดใต้ "ไทยและเอเชีย"; แถว "คะแนนสูงสุด" เปลี่ยนเป็น discover เรียงคะแนน + ต้องมีคนโหวต ≥1000 และไม่ส่ง region (เดิม region=TH ทำให้ปีเป็นปีฉายซ้ำในไทย เช่น Godfather 2022)
- **ภาษา:** คำแปลไทยครบอยู่แล้ว — ที่เห็นเมนูอังกฤษเพราะเบราว์เซอร์จำโหมด EN ไว้ และปุ่มเดิมแสดง "ภาษาที่จะเปลี่ยนไป" ทำให้สับสน → เปลี่ยนเป็น `components/LangSwitch.tsx` ปุ่มคู่ "ไทย | EN" ไฮไลต์ภาษาปัจจุบัน
- ยังเหลือ: หัวข้อแถวในหน้าแรก ("กำลังมาแรง", "คะแนนสูงสุด", "แนะนำสำหรับคุณ", "ไทยและเอเชีย") เขียนเป็นภาษาไทยตรงๆ ใน `app/page.tsx` ไม่ผ่าน `t()` → โหมด EN ยังเป็นไทย

## 📋 งานค้าง (เรียงตามความสำคัญ)
1. **commit + push ขึ้น GitHub + deploy Vercel production** — commit `b891b8f` ยังไม่ push; ไฟล์ใหม่/แก้ที่ยังไม่ commit: `0006_fix_save_permissions.sql`, `CLAUDE.md`, `lib/gemini.ts`, `app/api/ai/route.ts`, `app/api/ai/recommend/route.ts` (อย่า commit `.env.local`) (ไฟล์ .tsx ที่ขึ้นว่า modified 7 ไฟล์ ต่างแค่ line ending CRLF/LF ไม่ใช่งานจริง)
2. **แท็บเพลง** — ตอนนี้แสดง "หนังแนวดนตรี" จาก TMDb (genre 10402) ไม่ใช่เพลงจริง → ถามพี่แอ้ว่าจะทำเพลงจริง (เช่น MusicBrainz) หรือตัดแท็บ
3. **ระบบเพลย์ลิสต์** — มีตาราง playlists/playlist_items แล้ว แต่ยังไม่มีหน้าเว็บ/API
4. **จำกัด `/api/sync`** — ตอนนี้ผู้ใช้ที่ล็อกอินคนไหนก็สั่ง sync ได้ ควรจำกัดเฉพาะแอดมิน
5. **ระบบล็อกอิน** — `@supabase/auth-helpers-nextjs` เลิกพัฒนาแล้ว ควรย้ายไป `@supabase/ssr` (ต้องขออนุญาตพี่แอ้ก่อนเพราะเพิ่ม dependency)
6. `.gitignore` มี `.env*` ทำให้ `.env.local.example` ไม่ถูก commit — แก้เป็น `.env*.local` + `.env`

## คำสั่งที่ใช้บ่อย
```bash
npm run dev      # รันในเครื่อง http://localhost:3000
npm run build    # ต้องผ่านก่อนรายงานว่าเสร็จทุกครั้ง
```
SQL ใดๆ ให้พี่แอ้รันเองใน Supabase → SQL Editor โดยส่งโค้ดทั้งก้อนที่รันซ้ำได้ (ใช้ IF EXISTS / ON CONFLICT)
