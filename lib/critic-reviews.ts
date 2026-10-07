/** Shared by /api/critic-reviews, the admin page and the preview card. */
export interface CriticReview {
  id: string;
  tmdb_id: number;
  tmdb_media: 'movie' | 'tv';
  title: string | null;
  critic_name: string;
  outlet: string;
  quote: string;
  rating: string | null;
  source_url: string;
  published_at: string | null;
  created_at: string;
}

export const REVIEW_COLUMNS =
  'id, tmdb_id, tmdb_media, title, critic_name, outlet, quote, rating, source_url, published_at, created_at';

export const REVIEW_LIMITS = { name: 80, outlet: 80, quote: 300, rating: 20, url: 500, title: 200 } as const;

export interface ReviewInput {
  tmdb_id: number;
  tmdb_media: 'movie' | 'tv';
  title: string | null;
  critic_name: string;
  outlet: string;
  quote: string;
  rating: string | null;
  source_url: string;
  published_at: string | null;
}

const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** Validates admin input. Returns the clean row, or a Thai error message to show the admin. */
export function parseReviewInput(body: Record<string, unknown>): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  const tmdbId = Number(body.tmdb_id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return { ok: false, error: 'กรุณาเลือกเรื่อง' };
  const media = body.tmdb_media === 'tv' ? 'tv' : body.tmdb_media === 'movie' ? 'movie' : null;
  if (!media) return { ok: false, error: 'ประเภทไม่ถูกต้อง' };

  const critic = text(body.critic_name, REVIEW_LIMITS.name);
  if (!critic) return { ok: false, error: 'กรุณาใส่ชื่อนักวิจารณ์' };
  const outlet = text(body.outlet, REVIEW_LIMITS.outlet);
  if (!outlet) return { ok: false, error: 'กรุณาใส่ชื่อสื่อ' };

  // too long is an error, not a silent cut — a clipped quote could change what the critic said
  const quote = typeof body.quote === 'string' ? body.quote.trim() : '';
  if (!quote) return { ok: false, error: 'กรุณาใส่ประโยคที่คัดมา' };
  if (quote.length > REVIEW_LIMITS.quote) {
    return { ok: false, error: `ประโยคยาวเกิน ${REVIEW_LIMITS.quote} ตัวอักษร (คัดแค่ส่วนสั้นๆ แล้วให้ลิงก์ไปอ่านต่อ)` };
  }

  const url = text(body.source_url, REVIEW_LIMITS.url);
  if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://' };

  const date = text(body.published_at, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'วันที่ไม่ถูกต้อง' };

  return {
    ok: true,
    value: {
      tmdb_id: tmdbId,
      tmdb_media: media,
      title: text(body.title, REVIEW_LIMITS.title),
      critic_name: critic,
      outlet,
      quote,
      rating: text(body.rating, REVIEW_LIMITS.rating),
      source_url: url,
      published_at: date,
    },
  };
}
