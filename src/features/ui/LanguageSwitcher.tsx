import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { SUPPORTED_LOCALES } from '@/i18n/locales';
import { localizePath, stripLocale, useLocale } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useLocaleStore } from '@/i18n/store';
import { Button } from './primitives';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const setLocale = useLocaleStore((state) => state.setLocale);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
  const currentIndex = SUPPORTED_LOCALES.findIndex((l) => l.code === locale);

  useEffect(() => {
    if (open) optionRefs.current[currentIndex]?.focus();
  }, [currentIndex, open]);

  const switchTo = (code: (typeof SUPPORTED_LOCALES)[number]['code']) => {
    setOpen(false);
    if (code === locale) return;
    const { rest } = stripLocale(location.pathname);
    setLocale(code);
    navigate(localizePath(rest, code) + location.search + location.hash);
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      switchTo(SUPPORTED_LOCALES[index]!.code);
      return;
    }
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    )
      return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? SUPPORTED_LOCALES.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + SUPPORTED_LOCALES.length) %
            SUPPORTED_LOCALES.length;
    optionRefs.current[next]?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.changeLanguage')}
        iconOnly={compact}
        className={compact ? '' : 'w-full justify-between'}
      >
        <span className="flex items-center gap-2">
          <Globe size={16} aria-hidden="true" />
          {!compact && <span>{current.nativeLabel}</span>}
        </span>
        {!compact && <ChevronDown size={14} aria-hidden="true" />}
      </Button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-xl"
        >
          {SUPPORTED_LOCALES.map((l, i) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                tabIndex={l.code === locale ? 0 : -1}
                ref={(element) => {
                  optionRefs.current[i] = element;
                }}
                onClick={() => switchTo(l.code)}
                onKeyDown={(event) => handleOptionKeyDown(event, i)}
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
