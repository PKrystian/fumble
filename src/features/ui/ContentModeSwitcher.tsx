import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { type ContentMode, useContentModeStore } from './contentModeStore';
import { Button } from './primitives';

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

  const label = (m: ContentMode) => t(`content.${m === 'all' ? 'all' : `e${m}`}`);
  const currentIndex = MODES.indexOf(mode);

  useEffect(() => {
    if (open) optionRefs.current[currentIndex]?.focus();
  }, [currentIndex, open]);

  const choose = (m: ContentMode) => {
    setOpen(false);
    setMode(m);
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(MODES[index]!);
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
          ? MODES.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + MODES.length) % MODES.length;
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
        aria-label={t('content.aria')}
        title={t('content.aria')}
        iconOnly={compact}
        className={compact ? '' : 'w-full justify-between'}
      >
        <span className="flex items-center gap-2">
          <Layers size={16} aria-hidden="true" />
          {!compact && <span>{label(mode)}</span>}
        </span>
        {!compact && <ChevronDown size={14} aria-hidden="true" />}
      </Button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('content.aria')}
          className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-xl"
        >
          {MODES.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={m === mode}
                tabIndex={m === mode ? 0 : -1}
                ref={(element) => {
                  optionRefs.current[i] = element;
                }}
                onClick={() => choose(m)}
                onKeyDown={(event) => handleOptionKeyDown(event, i)}
                className={[
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm',
                  m === mode
                    ? 'bg-arcane-700 text-white'
                    : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50',
                ].join(' ')}
              >
                {label(m)}
                {m === mode && (
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
