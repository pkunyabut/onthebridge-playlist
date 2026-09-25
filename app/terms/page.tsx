'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import LangSwitch from '@/components/LangSwitch';
import SiteFooter, { CONTACT_EMAIL, TMDB_LOGO, TMDB_NOTICE } from '@/components/SiteFooter';

/** Sections in reading order: i18n keys terms_<key>_title / terms_<key>_text. */
const SECTIONS = ['purpose', 'not_owner', 'accuracy', 'account', 'ai', 'delete', 'free', 'links', 'changes'] as const;

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-cinema-950">
      <header className="sticky top-0 z-40 border-b border-cinema-border bg-cinema-950/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden="true">🌉</span>
            <span className="text-lg font-bold text-gold-gradient truncate">{t('app_name')}</span>
          </Link>
          <LangSwitch />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 text-base leading-relaxed text-cinema-text">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('terms_title')}</h1>
        <p className="text-sm text-cinema-text-muted mb-6">{t('terms_updated')}</p>
        <p className="mb-8">{t('terms_intro')}</p>

        {SECTIONS.slice(0, 2).map((key, i) => (
          <section key={key} className="mb-7">
            <h2 className="text-xl font-semibold text-white mb-2">
              {i + 1}. {t(`terms_${key}_title`)}
            </h2>
            <p>{t(`terms_${key}_text`)}</p>
          </section>
        ))}

        {/* Data sources & credits */}
        <section className="mb-7">
          <h2 className="text-xl font-semibold text-white mb-3">3. {t('terms_sources_title')}</h2>
          <ul className="space-y-4">
            <li className="p-4 rounded-xl bg-white/5 border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TMDB_LOGO} alt="TMDB" className="h-5 w-auto mb-2" />
              <p>{t('terms_source_tmdb')}</p>
              <p className="mt-1 text-sm text-cinema-text-muted">{TMDB_NOTICE}</p>
            </li>
            <li className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white">JustWatch</p>
              <p>{t('terms_source_justwatch')}</p>
            </li>
            <li className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white">Apple Music / iTunes</p>
              <p>{t('terms_source_apple')}</p>
            </li>
            <li className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white">YouTube</p>
              <p>{t('terms_source_youtube')}</p>
            </li>
            <li className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-white">Google Gemini</p>
              <p>{t('terms_source_gemini')}</p>
            </li>
          </ul>
        </section>

        {SECTIONS.slice(2).map((key, i) => (
          <section key={key} className="mb-7">
            <h2 className="text-xl font-semibold text-white mb-2">
              {i + 4}. {t(`terms_${key}_title`)}
            </h2>
            <p>{t(`terms_${key}_text`, { email: CONTACT_EMAIL })}</p>
          </section>
        ))}

        <section className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-2">{t('contact_title')}</h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
