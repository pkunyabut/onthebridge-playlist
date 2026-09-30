import { NextRequest, NextResponse } from 'next/server';
import { fetchTmdb } from '@/lib/tmdb-client';
import { LruCache } from '@/lib/tmdb-cache';

export const dynamic = 'force-dynamic';

interface TitleRequestItem {
  key: string;
  tmdb_id: number;
  media: 'movie' | 'tv';
}

interface RawDetails {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
}

const MAX_ITEMS = 60;
const LANGUAGES = ['th-TH', 'en-US'];
// '' = TMDb has no usable title in that language → the card keeps the saved title
const titleCache = new LruCache<string>(24 * 60 * 60 * 1000, 2000);

/**
 * Title of one TMDb movie/series in `language`. In th-TH, TMDb falls back to the original
 * title when there is no Thai one (e.g. Korean script) — return '' then, so the card keeps the
 * title the user saved instead of showing an unreadable one.
 */
async function lookupTitle(apiKey: string, item: TitleRequestItem, language: string): Promise<string> {
  const d = (await fetchTmdb(`/${item.media}/${item.tmdb_id}`, { language }, apiKey)) as RawDetails;
  const shown = (item.media === 'tv' ? d.name : d.title) ?? '';
  const original = item.media === 'tv' ? d.original_name : d.original_title;
  const untranslated = shown === original && !['th', 'en'].includes(d.original_language ?? '');
  return language.startsWith('th') && untranslated ? '' : shown;
}

// POST /api/tmdb/titles — { language, items: [{ key, tmdb_id, media }] } → { titles: { [key]: string } }
// Saved items keep the title they were saved with (usually Thai). The cards on Dashboard /
// รอดู / คอลเลกชัน ask for the title in the language of the ไทย | EN switch instead.
export async function POST(request: NextRequest) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า TMDB_API_KEY' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { language?: string; items?: TitleRequestItem[] } | null;
  const language = LANGUAGES.includes(body?.language ?? '') ? body!.language! : 'th-TH';
  const items = (body?.items ?? [])
    .filter((i) => i && typeof i.key === 'string' && Number.isInteger(i.tmdb_id) && (i.media === 'movie' || i.media === 'tv'))
    .slice(0, MAX_ITEMS);

  const titles: Record<string, string> = {};
  await Promise.all(
    items.map(async (item) => {
      const cacheKey = `${language}|${item.media}|${item.tmdb_id}`;
      const cached = titleCache.get(cacheKey);
      if (cached !== null) {
        if (cached) titles[item.key] = cached;
        return;
      }
      try {
        const title = await lookupTitle(apiKey, item, language);
        titleCache.set(cacheKey, title);
        if (title) titles[item.key] = title;
      } catch {
        // not cached — the card shows the saved title and we retry next time
      }
    }),
  );

  return NextResponse.json({ titles });
}
