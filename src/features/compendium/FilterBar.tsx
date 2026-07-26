import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import type { CategoryFilter } from './categories';
import { type SortDir, displayValue } from './filterSort';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface FilterBarProps {
  filters: CategoryFilter[];
  items: CompendiumEntryBase[];
  selected: Record<string, string[]>;
  onToggle: (filterId: string, value: string) => void;
  onClear: () => void;
  onRandom: () => void;
  sortField: string;
  sortDir: SortDir;
  onSortField: (field: string) => void;
  onToggleSortDir: () => void;
}

interface FilterGroup {
  filter: CategoryFilter;
  values: string[];
}

function chipClass(active: boolean): string {
  return [
    'rounded-full px-2 py-0.5 text-xs transition-colors',
    active
      ? 'bg-arcane-700 text-white ring-1 ring-arcane-300'
      : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
  ].join(' ');
}

function FacetSection({
  group,
  selected,
  onToggle,
  search,
  hideLabel,
  t,
  locale,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
  search: string;
  hideLabel?: boolean;
  t: TranslateFn;
  locale: Locale;
}) {
  const { filter, values } = group;
  const [expanded, setExpanded] = useState(false);
  const term = search.trim().toLowerCase();
  const visible = term
    ? values.filter((v) =>
        displayValue(filter, v, t, locale).toLowerCase().includes(term),
      )
    : values;
  if (visible.length === 0) return null;
  const selectedFirst = [
    ...visible.filter((value) => selected.includes(value)),
    ...visible.filter((value) => !selected.includes(value)),
  ];
  const shown = term || expanded ? visible : selectedFirst.slice(0, 16);
  const hasMore = !term && visible.length > 16;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <div className="flex items-baseline gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t(filter.label)}
            </p>
            <span className="text-[0.65rem] tabular-nums text-ink-500">
              {visible.length}
            </span>
          </div>
        )}
        <div className="ml-auto flex gap-2 text-[0.65rem] text-ink-400">
          <button
            type="button"
            onClick={() => visible.forEach((v) => !selected.includes(v) && onToggle(v))}
            className="hover:text-ink-50"
          >
            {t('compendium.filters.all')}
          </button>
          <button
            type="button"
            onClick={() => visible.forEach((v) => selected.includes(v) && onToggle(v))}
            className="hover:text-ink-50"
          >
            {t('compendium.filters.clear')}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {shown.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            aria-pressed={selected.includes(value)}
            className={chipClass(selected.includes(value))}
          >
            {displayValue(filter, value, t, locale)}
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 w-fit text-xs text-arcane-300 hover:text-arcane-200"
        >
          {expanded
            ? t('compendium.filters.showLess')
            : t('compendium.filters.showAllCount', { count: visible.length })}
        </button>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  items,
  selected,
  onToggle,
  onClear,
  onRandom,
  sortField,
  sortDir,
  onSortField,
  onToggleSortDir,
}: FilterBarProps) {
  const { t, locale } = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const groups = useMemo(
    () =>
      filters.map((filter) => {
        const values = new Set<string>();
        for (const item of items)
          for (const value of filter.valuesFor(item)) values.add(value);
        const sorted = [...values].sort((a, b) =>
          filter.sortKey
            ? filter.sortKey(a) - filter.sortKey(b)
            : displayValue(filter, a, t, locale).localeCompare(
                displayValue(filter, b, t, locale),
              ),
        );
        return { filter, values: sorted };
      }),
    [filters, items, t, locale],
  );

  const sourceGroup = groups.find((g) => g.filter.id === 'source');
  const otherGroups = groups.filter((g) => g.filter.id !== 'source');
  const coreValues = sourceGroup?.values.filter((v) => v !== HOMEBREW_SOURCE) ?? [];
  const homebrewValues = sourceGroup?.values.filter((v) => v === HOMEBREW_SOURCE) ?? [];

  const activeChips = groups.flatMap(({ filter, values }) =>
    values
      .filter((v) => selected[filter.id]?.includes(v))
      .map((value) => ({
        filterId: filter.id,
        value,
        label: displayValue(filter, value, t, locale),
      })),
  );
  const activeCount = activeChips.length;

  return (
    <div className="border-b border-ink-700">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-200 hover:text-ink-50"
        >
          <SlidersHorizontal size={15} />
          {t('compendium.filters.button')}
          {activeCount > 0 && (
            <span className="rounded-full bg-arcane-700 px-1.5 text-xs text-ink-50">
              {activeCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <select
            value={sortField}
            onChange={(e) => onSortField(e.target.value)}
            aria-label={t('compendium.sort.label')}
            title={t('compendium.sort.label')}
            className="max-w-[8rem] truncate rounded bg-ink-800 px-1.5 py-1 text-xs text-ink-200 transition-colors hover:bg-ink-700 focus:outline-none"
          >
            <option value="name">{t('compendium.sort.byName')}</option>
            {filters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {t(filter.label)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleSortDir}
            title={t('compendium.sort.toggleDirection')}
            aria-label={t(
              sortDir === 'asc'
                ? 'compendium.sort.ascending'
                : 'compendium.sort.descending',
            )}
            className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            {sortDir === 'asc' ? (
              <ArrowUpNarrowWide size={14} />
            ) : (
              <ArrowDownWideNarrow size={14} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-pressed={summaryOpen}
            title={t('compendium.filters.toggleSummary')}
            aria-label={t('compendium.filters.toggleSummary')}
            className={[
              'rounded p-1 transition-colors',
              summaryOpen
                ? 'bg-ink-800 text-ink-50'
                : 'text-ink-400 hover:bg-ink-800 hover:text-ink-50',
            ].join(' ')}
          >
            <SlidersHorizontal size={14} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={onRandom}
            title={t('compendium.filters.randomEntry')}
            aria-label={t('compendium.filters.jumpRandom')}
            className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            <Shuffle size={14} />
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            title={t('compendium.filters.resetFilters')}
            aria-label={t('compendium.filters.resetFilters')}
            className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50 disabled:opacity-40"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {summaryOpen && activeCount > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-ink-800 px-3 py-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.filterId}:${chip.value}`}
              type="button"
              onClick={() => onToggle(chip.filterId, chip.value)}
              className="inline-flex items-center gap-1 rounded-full bg-arcane-700 px-2 py-0.5 text-xs text-ink-50 hover:bg-arcane-500"
            >
              {chip.label}
              <X size={10} />
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('compendium.filters.dialog')}
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-16"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5">
                <Search size={14} className="text-ink-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('compendium.filters.searchPlaceholder')}
                  aria-label={t('compendium.filters.searchAria')}
                  className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
                />
              </div>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="whitespace-nowrap text-xs text-ink-400 hover:text-ink-50"
                >
                  {t('compendium.filters.clearAll')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label={t('compendium.filters.close')}
                className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              {sourceGroup && (coreValues.length > 0 || homebrewValues.length > 0) && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {t('compendium.filters.sourceHeading')}
                  </p>
                  {coreValues.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[0.65rem] italic text-ink-400">
                        {t('compendium.filters.coreSupplements')}
                      </p>
                      <FacetSection
                        group={{ filter: sourceGroup.filter, values: coreValues }}
                        selected={selected.source ?? []}
                        onToggle={(value) => onToggle('source', value)}
                        search={search}
                        hideLabel
                        t={t}
                        locale={locale}
                      />
                    </div>
                  )}
                  {homebrewValues.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[0.65rem] italic text-ink-400">
                        {t('compendium.homebrewLabel')}
                      </p>
                      <FacetSection
                        group={{ filter: sourceGroup.filter, values: homebrewValues }}
                        selected={selected.source ?? []}
                        onToggle={(value) => onToggle('source', value)}
                        search={search}
                        hideLabel
                        t={t}
                        locale={locale}
                      />
                    </div>
                  )}
                </div>
              )}

              {otherGroups.map((group) => (
                <FacetSection
                  key={group.filter.id}
                  group={group}
                  selected={selected[group.filter.id] ?? []}
                  onToggle={(value) => onToggle(group.filter.id, value)}
                  search={search}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
