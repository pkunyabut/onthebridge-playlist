import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface SavedMediaItem {
  title: string;
  type: string;
  platform?: string;
  genre?: string;
  year?: number;
  notes?: string;
}

interface Recommendation {
  title: string;
  type: string;
  reason: string;
  suggestedPlatform?: string;
}

// POST /api/ai/recommend — get AI recommendations based on user's saved items
// Reads user's saved items from Supabase, sends to Gemini, returns personalized recommendations
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey === 'your_gemini_api_key') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' }, { status: 500 });
  }

  // Read user's saved items from Supabase
  const { data: mediaItems, error: dbError } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const items: SavedMediaItem[] = mediaItems || [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'กรุณาเพิ่มรายการก่อนขอคำแนะนำ' }, { status: 400 });
  }

  // Build prompt for Gemini
  const itemsList = items
    .map((item, i) => {
      const parts = [item.title];
      if (item.type) parts.push(`(${item.type})`);
      if (item.genre) parts.push(`genre: ${item.genre}`);
      if (item.platform) parts.push(`platform: ${item.platform}`);
      if (item.year) parts.push(`year: ${item.year}`);
      return `${i + 1}. ${parts.join(', ')}`;
    })
    .join('\n');

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านภาพยนตร์ ซีรีส์ สารคดี และเพลง

รายการที่ผู้ใช้บันทึกไว้:
${itemsList}

จากรายการข้างต้น ให้แนะนำรายการใหม่ๆ ที่ผู้ใช้น่าจะชอบ 5-10 รายการ

ตอบในรูปแบบ JSON array เท่านั้น โดยแต่ละรายการมี:
- title: ชื่อเรื่อง (เป็นภาษาอังกฤษหรือไทยก็ได้)
- type: ประเภท (movie, series, documentary, music)
- reason: เหตุผลที่แนะนำ (ภาษาไทย สังเขป 1-2 ประโยค)
- suggestedPlatform: แพลตฟอร์มที่แนะนำ (netflix, disney, hbo, prime, youtube, spotify, apple_music, wetv, viu, iqiyi, youku, other)

ตอบเฉพาะ JSON array ไม่ต้องมีคำอธิบายเพิ่มเติม เช่น:
[
  {
    "title": "ชื่อเรื่อง",
    "type": "movie",
    "reason": "เพราะ...",
    "suggestedPlatform": "netflix"
  }
]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errData);
      return NextResponse.json(
        { error: `Gemini API ขัดข้อง (${response.status})` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (handle markdown code blocks)
    let recommendations: Recommendation[] = [];
    try {
      const cleaned = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      recommendations = JSON.parse(cleaned);
      if (!Array.isArray(recommendations)) {
        recommendations = [];
      }
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', parseErr, 'Raw:', text);
      return NextResponse.json({ error: 'ไม่สามารถอ่านผลลัพธ์จาก AI ได้' }, { status: 500 });
    }

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('AI recommend route error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI' }, { status: 500 });
  }
}

// GET /api/ai/recommend — simple test to verify Gemini API key works
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey === 'your_gemini_api_key') {
    return NextResponse.json({ working: false, reason: 'GEMINI_API_KEY not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ working: false, reason: `API returned ${response.status}` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ working: true, reply: text.trim() });
  } catch (err) {
    return NextResponse.json({ working: false, reason: String(err) });
  }
}
