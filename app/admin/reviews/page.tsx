'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useLanguage } from '@/context/LanguageContext';
import { REVIEW_LIMITS, type CriticReview } from '@/lib/critic-reviews';
import type { TmdbResult } from '@/lib/tmdb';

interface Picked {
  id: number;
  media: 'movie' | 'tv';
  title: string;
}

const EMPTY_FORM = { critic_name: '', outlet: '', quote: '', rating: '', source_url: '', published_at: '' };

const field =
  'w-full px-3 py-3 rounded-xl bg-white/5 border border-white/15 text-white text-base min-h-[48px] focus:outline-none focus:border-brand-500';

/** Owner-only page to add / edit / delete critic reviews (ADMIN_EMAILS is checked by the API). */
export default function AdminReviewsPage() {
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<CriticReview[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');

  // 1. pick a title
  const [q, setQ] = useState('');
  const [searchType, setSearchType] = useState<'movie' | 'tv'>('movie');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);

  // 2. fill in the review
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadRecent = useCallback(async () => {
    const res = await fetch('/api/critic-reviews?recent=1');
    if (res.status === 403) {
      setStatus('forbidden');
      return;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErrorText(data?.error ?? '');
      setStatus('error');
      return;
    }
    setReviews(data.reviews ?? []);
    setStatus('ok');
  }, []);

  useEffect(() => {
    loadRecent().catch(() => setStatus('error'));
  }, [loadRecent]);

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    setSearching(true);
    try {
      const language = lang === 'en' ? 'en-US' : 'th-TH';
      const res = await fetch(`/api/tmdb?q=${encodeURIComponent(query)}&type=${searchType}&language=${language}`);
      const data = res.ok ? await res.json() : null;
      setResults((data?.results ?? []).slice(0, 8));
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: TmdbResult) => {
    setPicked({ id: Number(r.id), media: searchType, title: r.year ? `${r.title} (${r.year})` : r.title });
    setResults([]);
    setMessage(null);
  };

  const edit = (r: CriticReview) => {
    setEditingId(r.id);
    setPicked({ id: r.tmdb_id, media: r.tmdb_media, title: r.title ?? `TMDB ${r.tmdb_id}` });
    setForm({
      critic_name: r.critic_name,
      outlet: r.outlet,
      quote: r.quote,
      rating: r.rating ?? '',
      source_url: r.source_url,
      published_at: r.published_at ?? '',
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!picked) {
      setMessage({ ok: false, text: t('admin_reviews_need_title') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/critic-reviews', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          tmdb_id: picked.id,
          tmdb_media: picked.media,
          title: picked.title,
          ...form,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({ ok: false, text: data?.error ?? t('admin_reviews_save_failed') });
        return;
      }
      setMessage({ ok: true, text: t('admin_reviews_saved') });
      reset();
      await loadRecent();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('admin_reviews_delete_confirm'))) return;
    const res = await fetch(`/api/critic-reviews?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === id) reset();
      await loadRecent();
    }
  };

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-4">{t('admin_reviews_title')}</h1>

        {status === 'loading' && <p className="text-base text-cinema-text-muted">{t('loading')}</p>}
        {status === 'forbidden' && <p className="text-base text-white">{t('admin_reviews_forbidden')}</p>}
        {status === 'error' && (
          <p className="text-base text-white">
            {t('admin_reviews_error')} {errorText}
          </p>
        )}

        {status === 'ok' && (
          <>
            {/* selection rules — the supply of real critic reviews is thin, quality matters more than count */}
            <section className="mb-6 p-3 rounded-xl border border-brand-500/40 bg-brand-600/10">
              <h2 className="text-base font-semibold text-white mb-1">{t('admin_reviews_rules_title')}</h2>
              <ol className="list-decimal pl-5 text-base text-white/90 space-y-0.5">
                <li>{t('admin_reviews_rule_1')}</li>
                <li>{t('admin_reviews_rule_2')}</li>
                <li>{t('admin_reviews_rule_3')}</li>
                <li>{t('admin_reviews_rule_4')}</li>
              </ol>
              <p className="text-sm text-cinema-text-muted mt-2">{t('admin_reviews_rules_note')}</p>
            </section>

            {/* 1. pick a title */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">{t('admin_reviews_pick')}</h2>
              <div className="segmented mb-2">
                <button className={searchType === 'movie' ? 'active' : ''} onClick={() => setSearchType('movie')}>
                  {t('origin_movie')}
                </button>
                <button className={searchType === 'tv' ? 'active' : ''} onClick={() => setSearchType('tv')}>
                  {t('origin_tv')}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className={field}
                  value={q}
                  placeholder={t('admin_reviews_search_ph')}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                />
                <button
                  onClick={search}
                  disabled={searching}
                  className="px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold min-h-[48px] whitespace-nowrap"
                >
                  {searching ? t('loading') : t('admin_reviews_search')}
                </button>
              </div>
              {results.length > 0 && (
                <ul className="mt-2 rounded-xl border border-white/10 divide-y divide-white/10">
                  {results.map((r) => (
                    <li key={String(r.id)}>
                      <button
                        onClick={() => pick(r)}
                        className="w-full text-left px-3 py-3 text-base text-white hover:bg-white/5 min-h-[48px]"
                      >
                        {r.title} {r.year ? <span className="text-cinema-text-muted">({r.year})</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked && (
                <p className="mt-2 text-base text-brand-400">{t('admin_reviews_selected', { title: picked.title })}</p>
              )}
            </section>

            {/* 2. fill in the review */}
            <section className="mb-8 space-y-3">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? t('admin_reviews_editing') : t('admin_reviews_fill')}
              </h2>
              <input className={field} placeholder={t('admin_reviews_critic')} value={form.critic_name} maxLength={REVIEW_LIMITS.name} onChange={set('critic_name')} />
              <input className={field} placeholder={t('admin_reviews_outlet')} value={form.outlet} maxLength={REVIEW_LIMITS.outlet} onChange={set('outlet')} />
              <div>
                <textarea
                  className={`${field} min-h-[120px]`}
                  placeholder={t('admin_reviews_quote', { max: REVIEW_LIMITS.quote })}
                  value={form.quote}
                  onChange={set('quote')}
                />
                <p className={`text-sm mt-1 ${form.quote.length > REVIEW_LIMITS.quote ? 'text-red-400' : 'text-cinema-text-muted'}`}>
                  {form.quote.length}/{REVIEW_LIMITS.quote}
                </p>
              </div>
              <input className={field} placeholder={t('admin_reviews_rating')} value={form.rating} maxLength={REVIEW_LIMITS.rating} onChange={set('rating')} />
              <input className={field} placeholder={t('admin_reviews_url')} value={form.source_url} inputMode="url" onChange={set('source_url')} />
              <label className="block text-sm text-cinema-text-muted">
                {t('admin_reviews_date')}
                <input className={`${field} mt-1`} type="date" value={form.published_at} onChange={set('published_at')} />
              </label>

              {message && <p className={`text-base ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>}

              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold min-h-[48px]"
                >
                  {saving ? t('loading') : t('admin_reviews_save')}
                </button>
                {editingId && (
                  <button onClick={reset} className="px-4 rounded-xl bg-white/10 text-white min-h-[48px]">
                    {t('cancel')}
                  </button>
                )}
              </div>
            </section>

            {/* recent */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-2">{t('admin_reviews_recent')}</h2>
              {reviews.length === 0 ? (
                <p className="text-base text-cinema-text-muted">{t('admin_reviews_empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="p-3 rounded-xl border border-white/10 bg-white/5">
                      <p className="text-sm text-brand-400">{r.title ?? `TMDB ${r.tmdb_id}`}</p>
                      <p className="text-base text-white mt-1">&ldquo;{r.quote}&rdquo;</p>
                      <p className="text-sm text-cinema-text-muted mt-1">
                        {r.critic_name} · {r.outlet}
                        {r.rating ? ` · ${r.rating}` : ''}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => edit(r)} className="px-3 rounded-lg bg-white/10 text-white text-sm min-h-[40px]">
                          {t('admin_reviews_edit')}
                        </button>
                        <button onClick={() => remove(r.id)} className="px-3 rounded-lg bg-red-600/80 text-white text-sm min-h-[40px]">
                          {t('delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
