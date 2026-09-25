import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { checkGeminiHealth, generateGeminiText, getGeminiApiKey, parseJsonArray } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

interface MediaItemInput {
  title: string;
  type: string;
  platform?: string;
  genre?: string;
  year?: number;
}

interface Recommendation {
  title: string;
  type: string;
  reason: string;
  suggestedPlatform?: string;
}

// POST /api/ai — get AI recommendations based on user's saved items
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' }, { status: 500 });
  }

  let body: { items?: MediaItemInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const items = body.items || [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'กรุณาเพิ่มรายการก่อนขอคำแนะนำ' }, { status: 400 });
  }

  // Build prompt for Gemini
  const itemsList = items
    .map((item, i) => `${i + 1}. ${item.title} (${item.type}${item.genre ? ', ' + item.genre : ''}${item.platform ? ', ' + item.platform : ''})`)
    .join('\n');

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านภาพยนตร์ ซีรีส์ สารคดี และเพลง

รายการที่ผู้ใช้บันทึกไว้:
${itemsList}

จากรายการข้างต้น ให้แนะนำรายการใหม่ๆ ที่ผู้ใช้น่าจะชอบ 5-10 รายการ

ตอบในรูปแบบ JSON array เท่านั้น โดยแต่ละรายการมี:
- title: ชื่อเรื่อง (เป็นภาษาอังกฤษหรือไทยก็ได้)
- type: ประเภท (movie, series, documentary, music)
- reason: เหตุผลที่แนะนำ (ภาษาไทย สังเขป 1-2 ประโยค)

ตอบเฉพาะ JSON array ไม่ต้องมีคำอธิบายเพิ่มเติม เช่น:
[
  {
    "title": "ชื่อเรื่อง",
    "type": "movie",
    "reason": "เพราะ..."
  }
]`;

  try {
    const result = await generateGeminiText(apiKey, prompt, {
      temperature: 0.7,
      // รุ่นใหม่ใช้ token ส่วนหนึ่งไป "คิด" ก่อนตอบ จึงเผื่อเพดานไว้สูงกว่าเดิม (เดิม 2048)
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    });

    if (!result.ok) {
      console.error('Gemini API error:', result.model, result.status, result.error);
      return NextResponse.json(
        { error: `Gemini API ขัดข้อง (${result.status})` },
        { status: 502 }
      );
    }

    const text = result.text;

    // Parse JSON from response (handle markdown code blocks)
    let recommendations: Recommendation[] = [];
    try {
      recommendations = parseJsonArray<Recommendation>(text);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', parseErr, 'Raw:', text);
      return NextResponse.json({ error: 'ไม่สามารถอ่านผลลัพธ์จาก AI ได้' }, { status: 500 });
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI' }, { status: 500 });
  }
}

// GET /api/ai/test — simple test to verify Gemini API key works
// ใครก็เปิดได้ จึงใช้ผลที่จำไว้ 10 นาที ไม่ถาม Google ทุกครั้ง (กันโควตาฟรีหมด)
export async function GET() {
  return NextResponse.json(await checkGeminiHealth());
}
