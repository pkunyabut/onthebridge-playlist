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

export interface GeminiHealth {
  working: boolean;
  model?: string;
  reply?: string;
  reason?: string;
  /** เวลาที่ถาม Google จริงครั้งล่าสุด (ISO) */
  checked_at: string;
}

// ผลตรวจล่าสุด — ใช้ซ้ำ 10 นาที เพื่อให้หน้าเช็ก (GET) ที่ใครก็เปิดได้ไม่ถาม Google ทุกครั้ง
// จนโควตาฟรีหมด (ถาม Google ได้ไม่เกิน ~6 ครั้ง/ชม. ต่อเซิร์ฟเวอร์หนึ่งตัว)
const HEALTH_TTL_MS = 10 * 60 * 1000;
let healthCache: { expires: number; result: Promise<GeminiHealth> } | null = null;

async function runHealthCheck(apiKey: string): Promise<GeminiHealth> {
  const checked_at = new Date().toISOString();
  try {
    // เผื่อ token ให้รุ่นที่ "คิด" ก่อนตอบ (เดิม 10 ซึ่งจะหมดก่อนได้คำตอบ)
    const result = await generateGeminiText(apiKey, 'Say "OK" in one word.', { maxOutputTokens: 1024 });
    if (!result.ok) {
      return { working: false, model: result.model, reason: `API returned ${result.status}`, checked_at };
    }
    return { working: true, model: result.model, reply: result.text.trim(), checked_at };
  } catch (err) {
    return { working: false, reason: String(err), checked_at };
  }
}

/** ใช้ในหน้าเช็กว่าปุ่ม AI ใช้ได้ไหม — คืนผลที่จำไว้ถ้ายังไม่เกิน 10 นาที */
export function checkGeminiHealth(): Promise<GeminiHealth> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return Promise.resolve({ working: false, reason: 'GEMINI_API_KEY not configured', checked_at: new Date().toISOString() });
  }
  if (healthCache && healthCache.expires > Date.now()) return healthCache.result;
  const result = runHealthCheck(apiKey);
  healthCache = { expires: Date.now() + HEALTH_TTL_MS, result };
  // ถ้าเช็กไม่ผ่าน จำไว้แค่ 1 นาที จะได้เห็นผลเร็วหลังแก้ปัญหา
  result.then((r) => {
    if (!r.working && healthCache?.result === result) healthCache.expires = Date.now() + 60 * 1000;
  });
  return result;
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
