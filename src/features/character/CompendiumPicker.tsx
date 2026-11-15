import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import type { CompendiumCategoryId, CompendiumEntryBase } from '@/data/compendium/types';
import { sourceName } from '@/data/compendium/sources';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { getCategory } from '@/features/compendium/categories';
import { applyContentMode } from '@/features/compendium/contentFilter';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { Button, IconButton, SearchField, ToggleChip } from '@/features/ui/primitives';
import { inputClass } from '@/features/ui/styles';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useT } from '@/i18n/useT';

export const PICKER_LIMIT = 20;

function matches(item: CompendiumEntryBase, term: string): boolean {
  return (
    normalizeSearchText(item.name).includes(term) ||
    normalizeSearchText(item.englishName ?? '').includes(term)
  );
}

function byName(a: CompendiumEntryBase, b: CompendiumEntryBase, term: string) {
  const aStarts = normalizeSearchText(a.name).startsWith(term) ? 0 : 1;
  const bStarts = normalizeSearchText(b.name).startsWith(term) ? 0 : 1;
  return aStarts - bStarts || a.name.localeCompare(b.name);
}

interface CompendiumPickerProps {
  categoryId: CompendiumCategoryId;
  label?: string;
  placeholder: string;
  onPick: (item: CompendiumEntryBase) => void;
  describe?: (item: CompendiumEntryBase) => string;
  accept?: (item: CompendiumEntryBase) => boolean;
}

export function CompendiumPicker({
  categoryId,
  label = '',
  placeholder,
  onPick,
  describe,
  accept,
}: CompendiumPickerProps) {
  const { t, locale } = useT();
  const listId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [added, setAdded] = useState<string | null>(null);
  const { status, items } = useCategoryItems(getCategory(categoryId));
  const contentMode = useContentModeStore((s) => s.mode);

  const visibleItems = useMemo(
    () => applyContentMode(items, contentMode).filter((item) => !accept || accept(item)),
    [items, contentMode, accept],
  );

  const availableSources = useMemo(
    () =>
      [...new Set(visibleItems.map((item) => item.source))].sort((a, b) =>
        sourceName(a, locale).localeCompare(sourceName(b, locale)),
      ),
    [visibleItems, locale],
  );

  const term = normalizeSearchText(query.trim());
  const allResults = useMemo(
    () =>
      term
        ? visibleItems
            .filter(
              (item) =>
                matches(item, term) &&
                (selectedSources.length === 0 || selectedSources.includes(item.source)),
            )
            .sort((a, b) => byName(a, b, term))
        : [],
    [visibleItems, term, selectedSources],
  );
  const results = allResults.slice(0, PICKER_LIMIT);
  const open = term.length > 0 && status !== 'loading';
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));

  const pick = (item: CompendiumEntryBase) => {
    onPick(item);
    setAdded(item.name);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + offset + results.length) % results.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setActive(event.key === 'Home' ? 0 : results.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(results[activeIndex]!);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-start gap-2">
        <SearchField
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0 ? `${listId}-${activeIndex}` : undefined
          }
          aria-describedby={statusId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setAdded(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={
            status === 'loading'
              ? t('character.sheet.picker.loadingCompendium')
              : placeholder
          }
          label={label || placeholder}
          onClear={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          clearLabel={t('common.clearSearch')}
        />
        {availableSources.length > 1 && (
          <Button
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
            aria-label={t('character.sheet.picker.filterBySource')}
            title={t('character.sheet.picker.filterBySource')}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {selectedSources.length > 0 && (
              <span className="tabular-nums">{selectedSources.length}</span>
            )}
          </Button>
        )}
      </div>
      {showFilters && availableSources.length > 1 && (
        <div
          role="group"
          aria-label={t('character.sheet.picker.filterBySource')}
          className="flex flex-wrap gap-1 rounded-lg border border-ink-700 bg-ink-950 p-2"
        >
          {availableSources.map((source) => (
            <ToggleChip
              key={source}
              active={selectedSources.includes(source)}
              onClick={() =>
                setSelectedSources((prev) =>
                  prev.includes(source)
                    ? prev.filter((entry) => entry !== source)
                    : [...prev, source],
                )
              }
            >
              {sourceName(source, locale)}
            </ToggleChip>
          ))}
          {selectedSources.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedSources([])}>
              {t('character.sheet.picker.clearSources')}
            </Button>
          )}
        </div>
      )}
      <div
        id={listId}
        role="listbox"
        aria-label={label || placeholder}
        hidden={!open}
        className="max-h-72 overflow-y-auto rounded-lg border border-ink-700 bg-ink-950 p-1"
      >
        {results.map((item, index) => {
          const meta = [describe?.(item), sourceName(item.source, locale)]
            .filter(Boolean)
            .join(' - ');
          return (
            <div
              key={item.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              aria-labelledby={`${listId}-${index}-name`}
              aria-describedby={meta ? `${listId}-${index}-meta` : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => pick(item)}
              className="selection-row cursor-pointer"
            >
              <span
                id={`${listId}-${index}-name`}
                className="block [overflow-wrap:anywhere]"
              >
                {item.name}
              </span>
              {meta && (
                <span
                  id={`${listId}-${index}-meta`}
                  className="block text-xs font-normal text-ink-400"
                >
                  {meta}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p id={statusId} role="status" className="text-xs text-ink-400">
        {open && results.length === 0
          ? t('character.sheet.picker.noMatches')
          : open && allResults.length > PICKER_LIMIT
            ? t('character.sheet.picker.limited', {
                shown: PICKER_LIMIT,
                count: allResults.length,
              })
            : added
              ? t('character.sheet.picker.added', { name: added })
              : ''}
      </p>
    </div>
  );
}

interface CompendiumSelectFieldProps {
  label: string;
  categoryId: CompendiumCategoryId;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}

export function CompendiumSelectField({
  label,
  categoryId,
  value,
  onChange,
  placeholder,
}: CompendiumSelectFieldProps) {
  const { t, locale } = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const dialogRef = useDialogFocus(open, close);
  const { status, items } = useCategoryItems(getCategory(categoryId));

  const lower = value.trim().toLowerCase();
  const selected =
    items.find((item) => item.id === value) ??
    (lower
      ? items.find(
          (item) =>
            item.name.toLowerCase() === lower ||
            item.englishName?.toLowerCase() === lower,
        )
      : undefined);
  const displayName = selected?.name ?? value;

  const results = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    const visible = items.filter((item) => !item.hidden);
    const filtered = term ? visible.filter((item) => matches(item, term)) : visible;
    return [...filtered].sort((a, b) => byName(a, b, term));
  }, [items, query]);

  const choose = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="field-label" aria-hidden="true">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label}: ${displayName || t('character.sheet.fields.noneSelected')}`}
        className={inputClass('relative flex items-center pr-10 text-left')}
      >
        <span className={`min-w-0 truncate ${displayName ? '' : 'text-ink-400'}`.trim()}>
          {displayName || t('character.sheet.fields.noneSelected')}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300"
        />
      </button>

      {open && (
        <div className="dialog-overlay" onClick={close}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="dialog-panel"
          >
            <header className="flex items-start justify-between gap-2 border-b border-ink-700 p-4">
              <h2 id={titleId} className="section-title">
                {label}
              </h2>
              <IconButton
                label={t('common.close')}
                variant="ghost"
                size="sm"
                onClick={close}
              >
                <X size={16} aria-hidden="true" />
              </IconButton>
            </header>
            <div className="border-b border-ink-700 p-3">
              <SearchField
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={status === 'loading' ? t('common.loading') : placeholder}
                label={placeholder}
                onClear={() => setQuery('')}
                clearLabel={t('common.clearSearch')}
              />
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-1" aria-label={label}>
              {value && (
                <li>
                  <button
                    type="button"
                    onClick={() => choose('')}
                    className="selection-row text-ink-300"
                  >
                    {t('character.sheet.fields.clearSelection')}
                  </button>
                </li>
              )}
              {results.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-400" role="status">
                  {status === 'loading' ? t('common.loading') : t('compendium.noMatches')}
                </li>
              )}
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item.id)}
                    className="selection-row"
                    aria-pressed={item.id === selected?.id}
                  >
                    <span className="block [overflow-wrap:anywhere]">{item.name}</span>
                    <span className="block text-xs font-normal text-ink-400">
                      {[
                        item.englishName && item.englishName !== item.name
                          ? item.englishName
                          : '',
                        sourceName(item.source, locale),
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                    </span>
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
