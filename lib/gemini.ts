/**
 * จุดเดียวที่เรียก Gemini API — แก้ชื่อรุ่นที่นี่ที่เดียว
 *
 * ใช้ชื่อกลาง "-latest" ที่ Google เลื่อนไปชี้รุ่นใหม่ให้เอง เพื่อไม่ให้พังซ้ำแบบ
 * gemini-2.0-flash ที่ถูกปิด (1 มิ.ย. 2026) แล้วตอบ 404
 * ถ้ารุ่นหลักเรียกไม่ได้ (404 / โควตาเต็ม 429 / Google ขัดข้อง 5xx) จะลองรุ่นสำรองต่อ
 * เปลี่ยนรุ่นหลักได้โดยตั้ง env GEMINI_MODEL ใน Vercel โดยไม่ต้องแก้โค้ด
 */

const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiApiKey(): string | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder' || apiKey === 'your_gemini_api_key') {
    return null;
  }
  return apiKey;
}

function modelList(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const list = preferred ? [preferred, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  return Array.from(new Set(list));
}

export interface GeminiResult {
  ok: boolean;
  status: number;
  text: string;
  model: string;
  error?: unknown;
}

export async function generateGeminiText(
  apiKey: string,
  prompt: string,
  generationConfig: Record<string, unknown> = {}
): Promise<GeminiResult> {
  let last: GeminiResult = { ok: false, status: 0, text: '', model: '' };

  for (const model of modelList()) {
    const response = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ส่งคีย์ใน header แทนใน URL เพื่อไม่ให้คีย์ไปโผล่ใน log
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // รุ่นใหม่อาจแบ่งคำตอบเป็นหลายส่วน — รวมทุกส่วนที่เป็นข้อความ (ข้ามส่วน "thought")
      const parts: Array<{ text?: string; thought?: boolean }> =
        data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('');
      return { ok: true, status: response.status, text, model };
    }

    const error = await response.json().catch(() => ({}));
    last = { ok: false, status: response.status, text: '', model, error };

    // ลองรุ่นถัดไปเฉพาะกรณีที่รุ่นนี้ใช้ไม่ได้ ถ้าเป็น 400/401/403 (คำขอหรือคีย์ผิด) ลองต่อก็ไม่ช่วย
    const retryable = response.status === 404 || response.status === 429 || response.status >= 500;
    if (!retryable) break;
  }

  return last;
}

/** ตัดครอบ ```json ... ``` ที่ AI บางครั้งใส่มา แล้วแปลงเป็น array */
export function parseJsonArray<T>(text: string): T[] {
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [];
}
