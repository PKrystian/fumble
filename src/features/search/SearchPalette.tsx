import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, Search, Shield, X } from 'lucide-react';
import { useHomebrewStore } from '@/features/homebrew/store';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { OriginalName } from '@/features/ui/OriginalName';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useLocale, useNavigate } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { IconButton, SearchField } from '@/features/ui/primitives';
import { useSearchStore } from './searchStore';
import {
  buildHomebrewResults,
  buildPool,
  loadSearchIndex,
  searchResults,
  type SearchIndex,
  type SearchResult,
} from './searchIndex';

function KindIcon({ kind }: { kind: SearchResult['kind'] }) {
  if (kind === 'homebrew') {
    return (
      <FlaskConical size={14} className="shrink-0 text-ember-400" aria-hidden="true" />
    );
  }
  if (kind === 'wiki') {
    return <Shield size={14} className="shrink-0 text-arcane-300" aria-hidden="true" />;
  }
  return <Search size={14} className="shrink-0 text-ink-500" aria-hidden="true" />;
}

export function SearchPalette() {
  const open = useSearchStore((s) => s.open);
  const setOpen = useSearchStore((s) => s.setOpen);
  const locale = useLocale();
  const navigate = useNavigate();
  const { t } = useT();
  const homebrew = useHomebrewStore((s) => s.entries);
  const contentMode = useContentModeStore((s) => s.mode);
  const showFumbleHomebrew = useFumbleHomebrewStore((s) => s.showInCompendium);

  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadSearchIndex(locale).then((results) => {
      if (!cancelled) setIndex(results);
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open]);

  const pool = useMemo(() => {
    const homebrewResults = buildHomebrewResults(homebrew, locale);
    return index
      ? [...homebrewResults, ...buildPool(index, contentMode, locale, showFumbleHomebrew)]
      : homebrewResults;
  }, [homebrew, index, contentMode, locale, showFumbleHomebrew]);

  const results = useMemo(() => searchResults(pool, query), [pool, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (event.key === 'Enter') {
        const pick = results[active];
        if (pick) {
          setOpen(false);
          navigate(pick.to);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, navigate, setOpen]);

  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const select = (result: SearchResult) => {
    setOpen(false);
    navigate(result.to);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh]">
      <button
        type="button"
        aria-label={t('common.close')}
        className="absolute inset-0 bg-black/60"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title')}
        className="relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-ink-700 p-3">
          <SearchField
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
            placeholder={t('search.placeholder')}
            label={t('search.title')}
            clearLabel={t('common.clearSearch')}
          />
          <IconButton
            onClick={() => setOpen(false)}
            label={t('common.close')}
            variant="ghost"
          >
            <X size={18} />
          </IconButton>
        </div>

        <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {query.trim() === '' && (
            <li className="px-4 py-6 text-center text-sm text-ink-400">
              {t('search.hint')}
            </li>
          )}
          {query.trim() !== '' && results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-400">
              {t('search.noResults')}
            </li>
          )}
          {results.map((result, i) => (
            <li key={`${result.kind}-${result.to}`}>
              <button
                type="button"
                onClick={() => select(result)}
                onMouseMove={() => setActive(i)}
                className={[
                  'flex w-full items-center gap-3 border-b border-ink-800 px-4 py-2.5 text-left transition-colors',
                  i === active ? 'bg-arcane-700 text-white' : 'hover:bg-ink-800/60',
                ].join(' ')}
              >
                <KindIcon kind={result.kind} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink-50">{result.name}</span>
                    <OriginalName name={result.englishName} className="text-xs" />
                  </span>
                  {result.subtitle && (
                    <span className="block truncate text-xs text-ink-400">
                      {result.subtitle}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-ink-800 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-ink-300">
                  {result.categoryLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
