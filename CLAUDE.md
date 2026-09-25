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
| **0007_media_items_music_and_tmdb** | ⏳ ส่งให้พี่แอ้รันแล้ว 25 ก.ย. 69 รอยืนยัน — เพิ่มคอลัมน์ `artist`, `album`, `cover_url`, `itunes_track_id`, `external_url`, `tmdb_id`, `tmdb_media` (ทั้งหมดไม่บังคับ) · **ห้าม deploy โค้ดที่ส่งคอลัมน์เหล่านี้ก่อนรัน** ไม่งั้นบันทึกหนังจากหน้าแรกจะ error |

`tmdb_music` (0003) เป็น cache "หนังแนวดนตรี" ของ TMDb ไม่ใช่เพลงจริง — เพลงจริงมาจาก iTunes และเก็บใน `media_items` (type `music`)

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

## 🤖 ปุ่ม AI (Gemini) — ✅ deploy และทดสอบบนเว็บจริงแล้ว
- 25 ก.ย. 69: พี่แอ้เลือกใช้ Gemini ต่อ ใส่คีย์ใหม่ใน Vercel แล้ว (Secret, All Environments) และมีสำเนาใน `.env.local`
- โค้ดเดิมเรียก `gemini-2.0-flash` ที่ Google ปิดแล้ว (1 มิ.ย. 2026) → 404
- แก้แล้ว: ทุกจุดเรียกผ่าน `lib/gemini.ts` ที่เดียว ใช้ `gemini-flash-latest` สำรองด้วย `gemini-flash-lite-latest` (สลับเองเมื่อ 404/429/5xx) ส่งคีย์ทาง header, เพิ่ม maxOutputTokens เผื่อรุ่นที่ "คิด" ก่อนตอบ, ขอคำตอบเป็น JSON
- เปลี่ยนรุ่นได้โดยตั้ง env `GEMINI_MODEL` ใน Vercel ไม่ต้องแก้โค้ด
- ✅ ทดสอบแล้ว 25 ก.ย. 69 (commit `e084c13`): `/api/ai/recommend` (GET) ได้ `"working": true, "model": "gemini-flash-latest"` และพี่แอ้กดปุ่ม AI ใน Dashboard ได้คำแนะนำภาษาไทย 6 เรื่องพร้อมเหตุผล
- ข้อจำกัด: แพลตฟอร์มที่ AI บอก (เช่น "hbo", "disney") เป็นการเดาของ AI ไม่ได้เช็กกับข้อมูลจริงของไทย

## 🐞 แก้หน้า Dashboard (25 ก.ย. 69) — ✅ deploy แล้ว (commit `6c70d59`)
- อาการ: กดปุ่ม AI ขึ้น "Add items to your watchlist…" ทั้งที่บันทึกรายการไว้แล้ว
- สาเหตุ: `app/dashboard/page.tsx` และ `app/dashboard/add/page.tsx` เช็ก session ด้วย `lib/supabase-browser` (client ธรรมดา อ่าน localStorage) แต่ระบบล็อกอินเก็บ session ใน cookie → ได้ null เสมอ ฟังก์ชันจบก่อนเรียก API รายการใน Dashboard จึงว่าง และฟอร์มเพิ่มรายการเองก็บันทึกไม่ได้
- แก้: เรียก `/api/media` ตรงๆ (API อ่าน cookie เอง) เหมือนหน้า watchlist — build ผ่านแล้ว
- ผลทดสอบ (พี่แอ้ทดสอบเองเพราะต้องล็อกอิน): ✅ Dashboard เห็นรายการที่บันทึก ("1 items total") · ✅ ปุ่ม AI ได้คำแนะนำภาษาไทย · ✅ ฟอร์ม `/dashboard/add` บันทึกได้ (Dashboard ขึ้น 2 รายการ)
- ข้อควรระวัง: ห้ามใช้ `supabase.auth.getSession()` จาก `lib/supabase-browser` เพื่อเช็กการล็อกอินในหน้าเว็บ

## 🎬 หน้าต่าง Preview ของการ์ด (25 ก.ย. 69) — ✅ deploy และทดสอบบนเว็บจริงแล้ว
- คลิกการ์ดแล้วหน้าต่างขึ้นอยู่แล้ว แต่ข้อมูลน้อย → เพิ่ม `app/api/tmdb/details` (TMDb details + credits + videos + watch/providers ของไทย, cache 6 ชม.) และ `components/MediaModal.tsx` ดึงมาแสดงตอนเปิด
- แสดง: ความยาว/จำนวนซีซัน, แนว, ปุ่ม "▶ ดูตัวอย่าง" (YouTube ฝังในหน้าต่าง เลือกคลิปไทยก่อน), เรื่องย่อไทย (ไม่มี→อังกฤษ), ผู้กำกับ/ผู้สร้าง, นักแสดง 5 คน (ชื่อที่ไม่ใช่อักษรไทย/ละติน เช่น จีน เกาหลี จะใช้ชื่ออังกฤษ), "ดูได้ที่ไหนในไทย" จากข้อมูลจริง + ลิงก์หน้า watch ของ TMDb
- `TMDB_API_KEY` ตั้งใน Vercel เฉพาะ Production และไม่มีใน `.env.local` → ทดสอบ API นี้ในเครื่องหรือบน Preview ไม่ได้

## 🧹 แก้จุดเล็ก 3 ข้อ (25 ก.ย. 69) — ✅ deploy และทดสอบบนเว็บจริงแล้ว
- **โควตา AI:** GET `/api/ai` และ `/api/ai/recommend` (ใครก็เปิดได้) ใช้ `checkGeminiHealth()` ใน `lib/gemini.ts` ที่จำผล 10 นาที (ถ้าล้มเหลวจำ 1 นาที) → ไม่ถาม Google ทุกครั้ง; ผลมี `checked_at` บอกเวลาที่ถามจริง
- **หน้าแรก:** ลบข้อความ `discover/movie?with_origin_country=…` ที่หลุดใต้ "ไทยและเอเชีย"; แถว "คะแนนสูงสุด" เปลี่ยนเป็น discover เรียงคะแนน + ต้องมีคนโหวต ≥1000 และไม่ส่ง region (เดิม region=TH ทำให้ปีเป็นปีฉายซ้ำในไทย เช่น Godfather 2022)
- **ภาษา:** คำแปลไทยครบอยู่แล้ว — ที่เห็นเมนูอังกฤษเพราะเบราว์เซอร์จำโหมด EN ไว้ และปุ่มเดิมแสดง "ภาษาที่จะเปลี่ยนไป" ทำให้สับสน → เปลี่ยนเป็น `components/LangSwitch.tsx` ปุ่มคู่ "ไทย | EN" ไฮไลต์ภาษาปัจจุบัน
- ✅ แปลหน้าแรกครบแล้ว: หัวข้อแถว, ปุ่มสตรีมมิ่ง/ในโรง, เลือกบริการ (ServicePicker), ชื่อประเทศ (`country_XX`), โน้ตบริการ (`SERVICE_OPTIONS[].noteKey`) ผ่าน `t()` ทั้งหมด และ **ข้อมูลจาก TMDb (ชื่อเรื่อง แนว เรื่องย่อใน Preview) เปลี่ยนภาษาตามปุ่ม ไทย | EN** (`language = lang === 'en' ? 'en-US' : 'th-TH'` ใน `app/page.tsx`)
- กติกา: ห้ามเขียนข้อความที่ผู้ใช้เห็นเป็นภาษาไทย/อังกฤษตรงๆ ใน JSX — เพิ่ม key ทั้งใน `lib/i18n/th.json` และ `en.json` แล้วใช้ `t()`
- ยังไม่ได้ทำ: หน้า `/search` ยังดึงผลค้นหาจาก TMDb เป็นภาษาไทยเสมอ (`language` คงที่ `th-TH`) — เมนูแปลแล้ว แต่ชื่อเรื่องในผลค้นหายังเป็นไทยในโหมด EN

## 🖼️ โปสเตอร์ + Preview ในหน้า Dashboard / รอดู (25 ก.ย. 69) — ✅ deploy และพี่แอ้ยืนยันแล้ว (โปสเตอร์ตรงเรื่อง, Preview ครบ)
- ตาราง `media_items` ไม่มีคอลัมน์ tmdb_id / poster → การ์ดเดิมเป็นไอคอน 🎬 และคลิกไม่ได้
- แก้โดยไม่แตะฐานข้อมูล: `app/api/tmdb/match` (POST รายการ → ค้น TMDb ด้วยชื่อ + ปี, cache 24 ชม.) + `lib/useTmdbMatches.ts` (hook ใช้ร่วมใน `app/dashboard/page.tsx` และ `app/watchlist/page.tsx`) → การ์ดมีโปสเตอร์ คลิกแล้วเปิด `MediaModal` ชุดเดียวกับหน้าแรก
- กติกาจับคู่: ถ้ามีปี ต้องได้เรื่องที่ปีต่างไม่เกิน ±1 (ไม่งั้นถือว่าไม่เจอ แสดงไอคอนเดิม — โปสเตอร์ผิดเรื่องแย่กว่าไม่มี) · ลอง `/search/{movie|tv}` ตามประเภท → ไม่ระบุปี → `/search/multi`
- ทดสอบ API บนเว็บจริง: "เดอะรันเนอร์" 2026 → The Runner (Gal Gadot) ✅, "สไปเดอร์-แมน: โฮมคัมมิ่ง" 2017 → Tom Holland ✅, "เดอะ รันเนอร์" (มีเว้นวรรค) 2026 → ไม่เจอ (ไม่แสดงผิดเรื่อง)
- ข้อจำกัด: ชื่อที่พิมพ์เองไม่ตรง TMDb อาจไม่เจอโปสเตอร์ · ทางที่ถูกกว่าในอนาคต = เพิ่มคอลัมน์ `tmdb_id`, `tmdb_media`, `poster_url` (migration ใหม่ ให้พี่แอ้รัน SQL) แล้วเก็บตอนกดบันทึกจากหน้าแรก
- ⚠️ ทดสอบด้วย curl บน Windows (Git Bash) ส่งภาษาไทยเพี้ยน → ใช้ `fetch` ในเบราว์เซอร์แทน

## 🎵 แท็บเพลงจริง (25 ก.ย. 69) — โค้ดพร้อม + ทดสอบในเครื่องผ่าน · ⏳ รอพี่แอ้รัน SQL 0007 ก่อน deploy
- พี่แอ้เลือก: เพิ่มคอลัมน์ในฐานข้อมูล (ทาง ข.), แสดงเท่าที่ทำได้, **ฟังได้แค่ตัวอย่าง 30 วินาทีเท่านั้น** (ห้ามเล่นเต็มเพลง/วิดีโอ)
- แหล่งข้อมูล (ฟรี ไม่ต้องใช้คีย์): เพลงฮิตไทย = Apple Music chart `rss.applemarketingtools.com/api/v2/th/music/most-played/50/songs.json` · ค้นหา/lookup = `itunes.apple.com/search|lookup?country=TH` (มี `previewUrl` 30 วิ)
- โค้ด: `lib/itunes.ts`, `app/api/music` (`?kind=top` | `?q=` | `?ids=`, cache 1 ชม.), `components/MusicBrowser.tsx` (แท็บ 🎵 เพลง ในหน้าแรก: ช่องค้นหา + อันดับเพลงฮิต), `components/MusicModal.tsx` (ปก, ศิลปิน, อัลบั้ม, `<audio>` ตัวอย่าง 30 วิ, ปุ่มเปิด Apple Music, ปุ่มบันทึก)
- บันทึกเพลง: `type: 'music'`, `platform: 'apple_music'` + `artist`, `album`, `cover_url`, `itunes_track_id`, `external_url` → การ์ดเพลงใน Dashboard/รอดู แสดงปก + ศิลปิน คลิกเปิด MusicModal (ดึงลิงก์ตัวอย่างใหม่จาก iTunes ตาม id)
- หนัง/ซีรีส์ที่บันทึกจากหน้าแรก/ค้นหา จะเก็บ `tmdb_id`, `tmdb_media`, `cover_url` ด้วย → `useTmdbMatches` ใช้ค่าตรงนี้ ไม่ต้องค้นจากชื่อ (รายการเก่ายังค้นจากชื่อเหมือนเดิม)
- ระบบจับคู่โปสเตอร์ TMDb **ข้ามรายการเพลงเสมอ** (deploy แล้ว commit `a3ba053`)
- ผลทดสอบในเครื่อง (จอ 375px): เพลงฮิต 50 เพลง มีเสียงตัวอย่างครบ 50 · ค้น "บอดี้สแลม" → Bodyslam · เสียงตัวอย่างโหลดได้ ยาว 30.01 วินาที · ไม่ล้นจอ
- ⚠️ `TaskStop` ของ `npx next start` ไม่ปิด node ลูก → เช็ก/ปิดพอร์ตด้วย PowerShell `Get-NetTCPConnection -LocalPort 3100`

## 📋 งานค้าง (เรียงตามความสำคัญ)
> สถานะ git (25 ก.ย. 69): ทุกอย่าง commit + push ขึ้น `main` แล้ว เหลือ `FIXES_ROUND1.md`, `RLS_FIX.md` ที่ไม่ได้ track (ของรอบ Hermes ล้าสมัย — ตั้งใจไม่ commit)
> Deploy: Vercel **ไม่ deploy อัตโนมัติ** เมื่อ push → ต้องสั่ง `vercel deploy --prod --yes` เองทุกครั้ง

1. **แท็บเพลง** — รอพี่แอ้ยืนยันว่ารัน SQL 0007 แล้ว → deploy → ทดสอบบนเว็บจริง: บันทึกหนังจากหน้าแรก, บันทึกเพลง, การ์ดเพลงใน Dashboard เปิดฟังตัวอย่างได้
2. **ระบบเพลย์ลิสต์** — มีตาราง playlists/playlist_items แล้ว แต่ยังไม่มีหน้าเว็บ/API
3. **สถานะ "ดูแล้ว / กำลังดู"** — ตอนนี้บันทึกได้แค่ "รอดู" ยังให้คะแนน/จดโน้ตไม่ได้
4. **จำกัด `/api/sync`** — ตอนนี้ผู้ใช้ที่ล็อกอินคนไหนก็สั่ง sync ได้ ควรจำกัดเฉพาะแอดมิน
5. **หน้า `/search` โหมด EN** — ผลค้นหายังดึงจาก TMDb เป็นภาษาไทยเสมอ
6. **ระบบล็อกอิน** — `@supabase/auth-helpers-nextjs` เลิกพัฒนาแล้ว ควรย้ายไป `@supabase/ssr` (ต้องขออนุญาตพี่แอ้ก่อนเพราะเพิ่ม dependency)
7. **ความเรียบร้อย (ผู้ใช้ 25–65+)** — หน้า "ไม่พบหน้านี้"/"เกิดข้อผิดพลาด" ภาษาไทย (`app/not-found.tsx`, `app/error.tsx`), ชื่อเรื่องภาษาอื่นที่ไม่มีชื่อไทย (เช่น ฝรั่งเศส) ให้ใช้ชื่ออังกฤษ, ผู้ใช้ใหม่เห็นแถว "แนะนำสำหรับคุณ" ซ้ำกับ "กำลังมาแรง", ไอคอนแอปบนมือถือ (manifest), รูป/คำอธิบายตอนแชร์ลิงก์ (OG), ทางติดต่ออื่นนอกจาก mailto (เช่น LINE OA), หน้านโยบายความเป็นส่วนตัว (PDPA)
8. `.gitignore` มี `.env*` ทำให้ `.env.local.example` ไม่ถูก commit — แก้เป็น `.env*.local` + `.env`

## คำสั่งที่ใช้บ่อย
```bash
npm run dev      # รันในเครื่อง http://localhost:3000
npm run build    # ต้องผ่านก่อนรายงานว่าเสร็จทุกครั้ง
```
SQL ใดๆ ให้พี่แอ้รันเองใน Supabase → SQL Editor โดยส่งโค้ดทั้งก้อนที่รันซ้ำได้ (ใช้ IF EXISTS / ON CONFLICT)
