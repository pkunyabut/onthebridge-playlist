'use client';

import { useLanguage, type Lang } from '@/context/LanguageContext';

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'EN' },
];

/**
 * Two-button "ไทย | EN" switch that highlights the language in use.
 * (The old single button showed the language you'd switch *to*, so people read
 * "ไทย" as the current language while the site was actually in English.)
 */
export default function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="ภาษา / Language"
      className={`inline-flex rounded-lg border border-cinema-border overflow-hidden ${className}`}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLang(opt.value)}
            aria-pressed={active}
            className={`px-3 py-1.5 min-h-[40px] text-sm font-bold transition-colors ${
              active
                ? 'bg-brand-600 text-white'
                : 'text-cinema-text-muted hover:bg-cinema-700'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
