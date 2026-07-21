import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { type ContentMode, useContentModeStore } from './contentModeStore';

interface ContentModeSwitcherProps {
  compact?: boolean;
}

const MODES: ContentMode[] = ['all', '2024', '2014'];

export function ContentModeSwitcher({ compact = false }: ContentModeSwitcherProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const mode = useContentModeStore((s) => s.mode);
  const setMode = useContentModeStore((s) => s.setMode);
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

  const label = (m: ContentMode) => t(`content.${m === 'all' ? 'all' : `e${m}`}`);

  const choose = (m: ContentMode) => {
    setOpen(false);
    setMode(m);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('content.aria')}
        title={t('content.aria')}
        className={[
          'flex items-center gap-2 rounded-md border border-ink-700 text-sm text-ink-200 transition-colors hover:border-arcane-500 hover:text-ink-50',
          compact ? 'justify-center p-2' : 'w-full justify-between px-3 py-1.5',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <Layers size={16} aria-hidden="true" />
          {!compact && <span>{label(mode)}</span>}
        </span>
        {!compact && <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('content.aria')}
          className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-xl"
        >
          {MODES.map((m) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={m === mode}
                onClick={() => choose(m)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-ink-200 hover:bg-ink-800 hover:text-ink-50"
              >
                {label(m)}
                {m === mode && (
                  <Check size={14} className="text-arcane-500" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
