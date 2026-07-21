import { useEffect, useMemo, useState } from 'react';
import { Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import type { CompendiumCategoryId, CompendiumEntryBase } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { applyContentMode } from '@/features/compendium/contentFilter';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useT } from '@/i18n/useT';
import { sourceName } from '@/data/compendium/sources';

interface CompendiumPickerProps {
  categoryId: CompendiumCategoryId;
  placeholder: string;
  onPick: (item: CompendiumEntryBase) => void;
}

export function CompendiumPicker({
  categoryId,
  placeholder,
  onPick,
}: CompendiumPickerProps) {
  const { t, locale } = useT();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { status, items } = useCategoryItems(getCategory(categoryId));
  const contentMode = useContentModeStore((s) => s.mode);

  const visibleItems = useMemo(
    () => applyContentMode(items, contentMode),
    [items, contentMode],
  );

  const availableSources = useMemo(
    () =>
      [...new Set(visibleItems.map((item) => item.source))].sort((a, b) =>
        sourceName(a, locale).localeCompare(sourceName(b, locale)),
      ),
    [visibleItems, locale],
  );

  const toggleSource = (source: string) =>
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return visibleItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(term) &&
          (selectedSources.length === 0 || selectedSources.includes(item.source)),
      )
      .slice(0, 8);
  }, [visibleItems, query, selectedSources]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-950 px-2 py-1">
        <Search size={14} className="text-ink-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            status === 'loading'
              ? t('character.sheet.picker.loadingCompendium')
              : placeholder
          }
          aria-label={placeholder}
          className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
        />
        {availableSources.length > 1 && (
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-pressed={showFilters}
            aria-label={t('character.sheet.picker.filterBySource')}
            className={[
              'inline-flex items-center rounded p-0.5 transition-colors',
              showFilters || selectedSources.length > 0
                ? 'text-arcane-400'
                : 'text-ink-400 hover:text-ink-100',
            ].join(' ')}
          >
            <SlidersHorizontal size={14} />
            {selectedSources.length > 0 && (
              <span className="ml-1 rounded-full bg-arcane-700 px-1 text-[10px] text-ink-50">
                {selectedSources.length}
              </span>
            )}
          </button>
        )}
      </div>
      {showFilters && availableSources.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1 rounded-md border border-ink-700 bg-ink-900 p-2">
          {availableSources.map((source) => {
            const active = selectedSources.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                aria-pressed={active}
                className={[
                  'rounded-full px-2 py-0.5 text-xs transition-colors',
                  active
                    ? 'bg-arcane-600 text-ink-50'
                    : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
                ].join(' ')}
              >
                {sourceName(source, locale)}
              </button>
            );
          })}
        </div>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink-700 bg-ink-800 shadow-xl">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(item);
                  setQuery('');
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-700"
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CompendiumSelectModalFieldProps {
  label: string;
  categoryId: CompendiumCategoryId;
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
}

export function CompendiumSelectModalField({
  label,
  categoryId,
  value,
  onChange,
  placeholder,
}: CompendiumSelectModalFieldProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { status, items } = useCategoryItems(getCategory(categoryId));

  // `value` is a stable compendium id; older sheets stored a (localized) name.
  const selected =
    items.find((item) => item.id === value) ??
    items.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
  const displayName = selected?.name ?? value;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = items.filter((item) => !item.hidden);
    const filtered = term
      ? visible.filter((item) => item.name.toLowerCase().includes(term))
      : visible;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query]);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${displayName || t('character.sheet.fields.noneSelected')}`}
        className="flex items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-left text-ink-50 hover:border-arcane-500"
      >
        <span className={displayName ? '' : 'text-ink-400'}>
          {displayName || t('character.sheet.fields.noneSelected')}
        </span>
        <Pencil size={13} className="shrink-0 text-ink-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-16"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[75vh] w-full max-w-md flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-ink-700 p-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5">
                <Search size={14} className="text-ink-400" aria-hidden="true" />
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={status === 'loading' ? t('common.loading') : placeholder}
                  aria-label={placeholder}
                  className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-1">
              {results.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-400">
                  {t('compendium.noMatches')}
                </li>
              )}
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={[
                      'block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-ink-800',
                      item.id === selected?.id
                        ? 'bg-ink-800 text-arcane-300'
                        : 'text-ink-100',
                    ].join(' ')}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
