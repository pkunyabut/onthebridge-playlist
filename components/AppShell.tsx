'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const { t, lang, setLang } = useLanguage();

  const navItems = [
    { href: '/dashboard', label: t('nav_home'), icon: '🏠' },
    { href: '/dashboard/add', label: t('nav_add'), icon: '➕' },
    { href: '/search', label: t('nav_search'), icon: '🔍' },
    { href: '/watchlist', label: t('nav_watchlist'), icon: '🔖' },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const toggleLang = () => {
    setLang(lang === 'th' ? 'en' : 'th');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-cinema-950">
      {/* Mobile Header — IMDb style dark bar */}
      <header className="sticky top-0 z-50 glass-strong border-b border-cinema-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌉</span>
            <span className="text-base font-bold text-gold-gradient">
              OnTheBridge
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-cinema-border text-cinema-text-muted hover:bg-cinema-700 transition-colors"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-cinema-700 transition-colors"
              aria-label={t('menu')}
            >
              <svg className="w-6 h-6 text-cinema-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="border-t border-cinema-border bg-cinema-900/95 backdrop-blur-xl px-4 py-3 space-y-1 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMenu(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'text-cinema-text-muted hover:bg-cinema-700'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="text-base">🚪</span>
              {t('logout')}
            </button>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-cinema-900/50 border-r border-cinema-border p-4 sticky top-0 h-screen backdrop-blur-sm">
          <Link href="/" className="flex items-center gap-2 px-4 py-3 mb-6">
            <span className="text-2xl">🌉</span>
            <span className="text-lg font-bold text-gold-gradient">
              OnTheBridge
            </span>
          </Link>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-glow'
                    : 'text-cinema-text-muted hover:bg-cinema-700 hover:text-cinema-text'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-1 pt-4 border-t border-cinema-border">
            <a
              href="mailto:thonglorproduction@gmail.com"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-cinema-text-muted hover:bg-cinema-700 transition-colors"
            >
              <span className="text-base">✉️</span>
              {t('contact_title')}
            </a>
            <button
              onClick={toggleLang}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-cinema-text-muted hover:bg-cinema-700 transition-colors"
            >
              <span className="text-base">🌐</span>
              {lang === 'th' ? 'English' : 'ไทย'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="text-base">🚪</span>
              {t('logout')}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-cinema-border safe-bottom z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[44px] justify-center ${
                isActive(item.href)
                  ? 'text-brand-400'
                  : 'text-cinema-text-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
