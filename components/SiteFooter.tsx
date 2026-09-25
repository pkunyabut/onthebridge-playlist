'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export const CONTACT_EMAIL = 'thonglorproduction@gmail.com';

/** Official TMDB logo (themoviedb.org/about/logos-attribution) — must stay smaller than our own logo. */
export const TMDB_LOGO =
  'https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

/** Notice TMDB's API Terms of Use (§3 Attribution) require, word for word. */
export const TMDB_NOTICE =
  'This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.';

/**
 * Site footer with the data-source credits our providers require:
 * TMDB (logo + notice), JustWatch (streaming availability), Apple Music / iTunes (music).
 */
export default function SiteFooter({ className = '' }: { className?: string }) {
  const { t, lang } = useLanguage();

  return (
    <footer className={`border-t border-cinema-border pt-8 pb-6 text-sm text-cinema-text-muted ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-base font-semibold text-white mb-3">{t('footer_sources_title')}</p>
        <ul className="space-y-3 mb-6">
          <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" aria-label="TMDB">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TMDB_LOGO} alt="TMDB" className="h-4 w-auto" />
            </a>
            <span>
              {lang === 'th' && <span className="block">{t('footer_tmdb_notice')}</span>}
              <span className="block">{TMDB_NOTICE}</span>
            </span>
          </li>
          <li>
            {t('footer_justwatch')}{' '}
            <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              JustWatch
            </a>
          </li>
          <li>
            {t('footer_apple')}{' '}
            <a href="https://music.apple.com/th/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
              Apple Music
            </a>
          </li>
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/5 pt-4 text-center">
          <Link href="/terms" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
            {t('footer_terms_link')}
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-400 hover:text-brand-300">
            ✉️ {CONTACT_EMAIL}
          </a>
          <span>{t('footer_copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
