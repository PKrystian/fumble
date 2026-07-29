import { useEffect, useRef, useState } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { localizePath, stripLocale, useLocale } from '@/i18n/path';
import { useT } from '@/i18n/useT';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)!;

  const switchTo = (code: (typeof SUPPORTED_LOCALES)[number]['code']) => {
    setOpen(false);
    if (code === locale) return;
    const { rest } = stripLocale(location.pathname);
    navigate(localizePath(rest, code) + location.search);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.changeLanguage')}
        className={[
          'flex items-center gap-2 rounded-md border border-ink-700 text-sm text-ink-200 transition-colors hover:border-arcane-500 hover:text-ink-50',
          compact ? 'justify-center p-2' : 'w-full justify-between px-3 py-1.5',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <Globe size={16} aria-hidden="true" />
          {!compact && <span>{current.nativeLabel}</span>}
        </span>
        {!compact && <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-xl"
        >
          {SUPPORTED_LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                onClick={() => switchTo(l.code)}
                className={[
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm',
                  l.code === locale
                    ? 'bg-arcane-700 text-white'
                    : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50',
                ].join(' ')}
              >
                {l.nativeLabel}
                {l.code === locale && (
                  <Check size={14} className="text-white" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
