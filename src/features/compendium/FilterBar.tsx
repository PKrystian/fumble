import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import { useT } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import {
  Button,
  IconButton,
  SearchField,
  Select,
  ToggleChip,
} from '@/features/ui/primitives';
import type { CategoryFilter } from './categories';
import { filterValuesFor, type SortDir, displayValue } from './filterSort';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface FilterBarProps {
  filters: CategoryFilter[];
  items: CompendiumEntryBase[];
  selected: Record<string, string[]>;
  includeAny?: Record<string, boolean>;
  onToggle: (filterId: string, value: string) => void;
  onSetFilter: (filterId: string, values: string[]) => void;
  onToggleIncludeAny?: (filterId: string) => void;
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

function FacetSection({
  group,
  selected,
  onToggle,
  onSet,
  includeAny,
  onToggleIncludeAny,
  search,
  hideLabel,
  t,
  locale,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
  onSet: (values: string[]) => void;
  includeAny?: boolean;
  onToggleIncludeAny?: () => void;
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
  const shown =
    term || expanded
      ? visible
      : [
          ...visible.slice(0, 16),
          ...visible.slice(16).filter((value) => selected.includes(value)),
        ];
  const hasMore = !term && (expanded || shown.length < visible.length);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[0.65rem] text-ink-400">
          {filter.includeAny && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-300">
              <input
                type="checkbox"
                checked={includeAny}
                disabled={selected.length === 0}
                onChange={onToggleIncludeAny}
                aria-label={t('compendium.filters.includeAny')}
                className="h-4 w-4 rounded border-ink-600 bg-ink-950 text-arcane-500 accent-arcane-500 focus:ring-arcane-400"
              />
              {t('compendium.filters.includeAny')}
            </label>
          )}
          <Button
            type="button"
            onClick={() => onSet([...new Set([...selected, ...visible])])}
            variant="ghost"
            size="sm"
            className="min-h-0 px-1 py-0 text-[0.65rem]"
          >
            {t('compendium.filters.all')}
          </Button>
          <Button
            type="button"
            onClick={() => onSet(selected.filter((value) => !visible.includes(value)))}
            variant="ghost"
            size="sm"
            className="min-h-0 px-1 py-0 text-[0.65rem]"
          >
            {t('compendium.filters.clear')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {shown.map((value) => (
          <ToggleChip
            key={value}
            onClick={() => onToggle(value)}
            active={selected.includes(value)}
          >
            {displayValue(filter, value, t, locale)}
          </ToggleChip>
        ))}
      </div>
      {hasMore && (
        <Button
          onClick={() => setExpanded((value) => !value)}
          variant="ghost"
          size="sm"
          className="mt-1 w-fit px-1 text-arcane-300 hover:text-arcane-200"
        >
          {expanded
            ? t('compendium.filters.showLess')
            : t('compendium.filters.showAllCount', { count: visible.length })}
        </Button>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  items,
  selected,
  includeAny = {},
  onToggle,
  onSetFilter,
  onToggleIncludeAny,
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
          for (const value of filterValuesFor(filter, item)) values.add(value);
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
  const activeAnyFilters = groups.filter(
    ({ filter }) =>
      filter.includeAny &&
      includeAny[filter.id] &&
      (selected[filter.id]?.length ?? 0) > 0,
  );
  const activeCount = activeChips.length + activeAnyFilters.length;

  return (
    <div className="border-b border-ink-700">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Button onClick={() => setModalOpen(true)} variant="ghost" size="sm">
          <SlidersHorizontal size={15} />
          {t('compendium.filters.button')}
          {activeCount > 0 && (
            <span className="rounded-full bg-arcane-700 px-1.5 text-xs text-ink-50">
              {activeCount}
            </span>
          )}
        </Button>
        <div className="flex items-center gap-1">
          <Select
            value={sortField}
            onChange={(e) => onSortField(e.target.value)}
            aria-label={t('compendium.sort.label')}
            title={t('compendium.sort.label')}
            className="min-h-8 max-w-[8rem] truncate px-2 py-1 text-xs"
          >
            <option value="name">{t('compendium.sort.byName')}</option>
            {filters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {t(filter.label)}
              </option>
            ))}
          </Select>
          <IconButton
            onClick={onToggleSortDir}
            title={t('compendium.sort.toggleDirection')}
            label={t(
              sortDir === 'asc'
                ? 'compendium.sort.ascending'
                : 'compendium.sort.descending',
            )}
            variant="ghost"
            size="sm"
          >
            {sortDir === 'asc' ? (
              <ArrowUpNarrowWide size={14} />
            ) : (
              <ArrowDownWideNarrow size={14} />
            )}
          </IconButton>
          <IconButton
            onClick={() => setSummaryOpen((v) => !v)}
            aria-pressed={summaryOpen}
            title={t('compendium.filters.toggleSummary')}
            label={t('compendium.filters.toggleSummary')}
            variant="ghost"
            size="sm"
            className={summaryOpen ? 'bg-ink-800 text-ink-50' : ''}
          >
            <SlidersHorizontal size={14} className="rotate-90" />
          </IconButton>
          <IconButton
            onClick={onRandom}
            title={t('compendium.filters.randomEntry')}
            label={t('compendium.filters.jumpRandom')}
            variant="ghost"
            size="sm"
          >
            <Shuffle size={14} />
          </IconButton>
          <IconButton
            onClick={onClear}
            disabled={activeCount === 0}
            title={t('compendium.filters.resetFilters')}
            label={t('compendium.filters.resetFilters')}
            variant="ghost"
            size="sm"
          >
            <RotateCcw size={14} />
          </IconButton>
        </div>
      </div>

      {summaryOpen && activeCount > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-ink-800 px-3 py-2">
          {activeChips.map((chip) => (
            <ToggleChip
              key={`${chip.filterId}:${chip.value}`}
              onClick={() => onToggle(chip.filterId, chip.value)}
              active
              className="gap-1"
            >
              {chip.label}
              <X size={10} />
            </ToggleChip>
          ))}
          {activeAnyFilters.map(({ filter }) => (
            <ToggleChip
              key={`${filter.id}:include-any`}
              onClick={() => onToggleIncludeAny?.(filter.id)}
              active
              className="gap-1"
            >
              {t('compendium.filters.includeAny')}
              <X size={10} />
            </ToggleChip>
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
              <SearchField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder={t('compendium.filters.searchPlaceholder')}
                label={t('compendium.filters.searchAria')}
                clearLabel={t('common.clearSearch')}
              />
              {activeCount > 0 && (
                <Button
                  onClick={onClear}
                  variant="ghost"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {t('compendium.filters.clearAll')}
                </Button>
              )}
              <IconButton
                onClick={() => setModalOpen(false)}
                label={t('compendium.filters.close')}
                variant="ghost"
                size="sm"
              >
                <X size={16} />
              </IconButton>
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
                        onSet={(values) => onSetFilter('source', values)}
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
                        onSet={(values) => onSetFilter('source', values)}
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
                  onSet={(values) => onSetFilter(group.filter.id, values)}
                  {...(group.filter.includeAny
                    ? {
                        includeAny: Boolean(includeAny[group.filter.id]),
                        ...(onToggleIncludeAny
                          ? {
                              onToggleIncludeAny: () =>
                                onToggleIncludeAny(group.filter.id),
                            }
                          : {}),
                      }
                    : {})}
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
