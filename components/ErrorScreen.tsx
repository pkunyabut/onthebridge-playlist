'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import LangSwitch from '@/components/LangSwitch';
import SiteFooter from '@/components/SiteFooter';

/** Full-page message shared by app/not-found.tsx and app/error.tsx — big text and big buttons for all ages. */
export default function ErrorScreen({
  icon,
  title,
  message,
  onRetry,
}: {
  icon: string;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-cinema-950 flex flex-col">
      <header className="glass-strong border-b border-cinema-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden="true">🌉</span>
            <span className="text-lg font-bold text-gold-gradient truncate">{t('app_name')}</span>
          </Link>
          <LangSwitch />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-5" aria-hidden="true">{icon}</div>
          <h1 className="text-2xl font-bold text-white mb-3">{title}</h1>
          <p className="text-lg text-cinema-text-muted mb-8 leading-relaxed">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-[48px] px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-base transition-colors shadow-gold"
              >
                🔄 {t('error_retry')}
              </button>
            )}
            <Link
              href="/"
              className={`min-h-[48px] inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-base transition-colors ${
                onRetry
                  ? 'border border-cinema-border text-cinema-text hover:bg-cinema-800'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-gold'
              }`}
            >
              🏠 {t('error_go_home')}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
