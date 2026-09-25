'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Horizontal card row with ◀ ▶ buttons on larger screens (a mouse can't swipe, and the
 * scrollbar is hidden). Cards snap so the row always rests on a whole card at the left
 * edge instead of a half-cut one. Touch screens keep plain swiping.
 */
export default function ScrollRow({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, update]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const arrow =
    'hidden sm:flex absolute top-[38%] -translate-y-1/2 z-10 w-11 h-11 items-center justify-center ' +
    'rounded-full bg-black/80 border border-white/20 text-white text-2xl shadow-lg hover:bg-brand-600 transition-colors';

  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className="suggest-row scrollbar-hide">
        {children}
      </div>
      {canLeft && (
        <button type="button" onClick={() => scrollByPage(-1)} className={`${arrow} left-1`} aria-label={t('scroll_left')}>
          ‹
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scrollByPage(1)} className={`${arrow} right-1`} aria-label={t('scroll_right')}>
          ›
        </button>
      )}
    </div>
  );
}
