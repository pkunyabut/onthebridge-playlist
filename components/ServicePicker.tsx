'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { PLATFORM_ICONS } from '@/lib/types';
import { SERVICE_OPTIONS } from '@/lib/tmdb';

export interface ProviderCatalogEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  service_key: string | null;
}

interface ServicePickerProps {
  open: boolean;
  selected: string[];
  onlyMine: boolean;
  onChange: (keys: string[]) => void;
  onToggleOnlyMine: (value: boolean) => void;
  onClose: () => void;
}

const LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

/**
 * Item 4 — "เลือกบริการที่คุณดูอยู่". The 11 services the user asked for, each matched
 * against TMDb's real TH provider catalog by provider id, so the logo shown is TMDb's
 * own artwork for the service as it exists in Thailand.
 */
export default function ServicePicker({
  open,
  selected,
  onlyMine,
  onChange,
  onToggleOnlyMine,
  onClose,
}: ServicePickerProps) {
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<ProviderCatalogEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/tmdb/providers?region=TH')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { providers?: ProviderCatalogEntry[] } | null) => {
        if (!cancelled && data?.providers) setCatalog(data.providers);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  const logoFor = (providerIds: number[]): string | null => {
    for (const id of providerIds) {
      const entry = catalog.find((c) => c.provider_id === id);
      if (entry?.logo_path) return `${LOGO_BASE}${entry.logo_path}`;
    }
    return null;
  };

  return (
    <div className="imdb-modal-backdrop" onClick={onClose}>
      <div className="panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-white">{t('picker_title')}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>
        <p className="text-base text-cinema-text-muted mb-4">
          {t('picker_desc')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SERVICE_OPTIONS.map((service) => {
            const isSelected = selected.includes(service.key);
            const logo = logoFor(service.providerIds);
            return (
              <button
                key={service.key}
                type="button"
                onClick={() => toggle(service.key)}
                className={`service-chip ${isSelected ? 'selected' : ''}`}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={service.label} />
                ) : (
                  <span className="icon-fallback">{PLATFORM_ICONS[service.platform]}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate">{service.label}</span>
                  {service.noteKey && (
                    <span className="block text-sm font-normal text-cinema-text-muted">{t(service.noteKey)}</span>
                  )}
                </span>
                {isSelected && <span className="check">✓</span>}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-3 mt-5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => onToggleOnlyMine(e.target.checked)}
            className="w-6 h-6 accent-brand-500"
          />
          <span className="text-base font-medium text-cinema-text">{t('picker_only_mine')}</span>
        </label>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => onChange([])}
            className="px-4 py-3 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-cinema-text text-base font-medium hover:bg-white/10"
          >
            {t('picker_clear')}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 min-h-[44px] rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-semibold"
          >
            {t('picker_done')}
          </button>
        </div>

        <p className="text-sm text-cinema-text-muted mt-4">
          {t('picker_footer')}
        </p>
      </div>
    </div>
  );
}