import { useId, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import { useT } from '@/i18n/useT';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import type { Locale } from '@/i18n/locales';
import {
  Button,
  IconButton,
  SearchField,
  Select,
  ToggleChip,
} from '@/features/ui/primitives';
import type { CategoryFilter } from './categories';
import {
  filterValuesFor,
  facetCounts,
  matchesFilters,
  type SortDir,
  displayValue,
} from './filterSort';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;
interface FilterBarProps {
  filters: CategoryFilter[];
  items: CompendiumEntryBase[];
  queryItems?: CompendiumEntryBase[];
  selected: Record<string, string[]>;
  includeAny?: Record<string, boolean>;
  onToggle: (filterId: string, value: string) => void;
  onSetFilter: (filterId: string, values: string[]) => void;
  onToggleIncludeAny?: (filterId: string) => void;
  onClear: () => void;
  onRandom: () => void;
  sortField: string;
  sortDir: SortDir;
  sortOptions?: CategoryFilter[];
  onSortField: (field: string) => void;
  onToggleSortDir: () => void;
}
interface FilterGroup {
  filter: CategoryFilter;
  values: string[];
  available: Set<string>;
}

function FacetSection({
  group,
  selected,
  counts,
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
  counts: Map<string, number>;
  onToggle: (value: string) => void;
  onSet: (values: string[]) => void;
  includeAny?: boolean;
  onToggleIncludeAny?: () => void;
  search: string;
  hideLabel?: boolean;
  t: TranslateFn;
  locale: Locale;
}) {
  const { filter, values, available } = group;
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const term = normalizeSearchText(search.trim());
  const groupMatches = normalizeSearchText(t(filter.label)).includes(term);
  const visible =
    term && !groupMatches
      ? values.filter((value) =>
          normalizeSearchText(
            `${displayValue(filter, value, t, locale)} ${value}`,
          ).includes(term),
        )
      : values;
  if (!visible.length) return null;
  const shown =
    term || expanded
      ? visible
      : [
          ...visible.slice(0, 16),
          ...visible.slice(16).filter((value) => selected.includes(value)),
        ];
  const hasMore = !term && (expanded || shown.length < visible.length);
  const list = values.length > 40;
  return (
    <section
      role="group"
      aria-label={t(filter.label)}
      className="flex min-w-0 flex-col gap-2 border-b border-ink-800 pb-4 last:border-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!hideLabel && (
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full whitespace-normal text-left"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={collapsed ? 'shrink-0 -rotate-90' : 'shrink-0'}
            />
            <span className="font-semibold">{t(filter.label)}</span>
            <span aria-hidden="true" className="text-xs text-ink-400">
              {visible.length}
            </span>
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {filter.includeAny && (
            <label className="flex min-h-10 items-center gap-2 text-xs text-ink-300">
              <input
                type="checkbox"
                checked={includeAny}
                disabled={!selected.length}
                onChange={onToggleIncludeAny}
                aria-label={t('compendium.filters.includeAny')}
                className="accent-arcane-500"
              />
              {t('compendium.filters.includeAny')}
            </label>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSet([...new Set([...selected, ...visible])])}
          >
            {t('compendium.filters.all')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!selected.length}
            onClick={() => onSet([])}
          >
            {t('compendium.filters.clear')}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <>
          {filter.description && (
            <p className="text-xs text-ink-400">{t(filter.description)}</p>
          )}
          <div
            className={
              list
                ? 'flex max-h-56 flex-col gap-1 overflow-y-auto'
                : 'flex flex-wrap gap-1'
            }
          >
            {shown.map((value) => {
              const active = selected.includes(value),
                count = counts.get(value) ?? 0,
                label = displayValue(filter, value, t, locale);
              return list ? (
                <label
                  key={value}
                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-ink-200 hover:bg-ink-800"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(value)}
                    className="accent-arcane-500"
                  />
                  <span className="min-w-0 flex-1 break-words">
                    {label}
                    {!available.has(value) && (
                      <span className="ml-1 text-xs text-ink-400">
                        {t('compendium.catalog.unavailable')}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-xs tabular-nums text-ink-400">
                    {count}
                  </span>
                </label>
              ) : (
                <ToggleChip
                  key={value}
                  active={active}
                  onClick={() => onToggle(value)}
                  className="max-w-full gap-2 whitespace-normal text-left"
                >
                  <span>
                    {label}
                    {!available.has(value) && (
                      <span className="ml-1 text-xs">
                        {t('compendium.catalog.unavailable')}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-xs tabular-nums opacity-75">
                    {count}
                  </span>
                </ToggleChip>
              );
            })}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded
                ? t('compendium.filters.showLess')
                : t('compendium.filters.showAllCount', { count: visible.length })}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export function FilterBar({
  filters,
  items,
  queryItems = items,
  selected,
  includeAny = {},
  onToggle,
  onSetFilter,
  onToggleIncludeAny,
  onClear,
  onRandom,
  sortField,
  sortDir,
  sortOptions = filters,
  onSortField,
  onToggleSortDir,
}: FilterBarProps) {
  const { t, locale } = useT();
  const id = useId();
  const [modalOpen, setModalOpen] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(true),
    [search, setSearch] = useState('');
  const dialogRef = useDialogFocus(modalOpen, () => setModalOpen(false));
  const counts = useMemo(
    () => facetCounts(queryItems, filters, selected, includeAny),
    [queryItems, filters, selected, includeAny],
  );
  const resultCount = useMemo(
    () =>
      queryItems.filter((item) => matchesFilters(item, filters, selected, includeAny))
        .length,
    [queryItems, filters, selected, includeAny],
  );
  const groups = useMemo(
    () =>
      filters
        .map((filter) => {
          const classFilter = filters.find((candidate) => candidate.id === 'class');
          const matchingItems =
            filter.id === 'subclass' && classFilter && selected.class?.length
              ? items.filter((item) => matchesFilters(item, [classFilter], selected))
              : items;
          const available = new Set(
            matchingItems.flatMap((item) => filterValuesFor(filter, item)),
          );
          const values = [
            ...new Set([...available, ...(selected[filter.id] ?? [])]),
          ].sort((a, b) =>
            filter.sortKey
              ? filter.sortKey(a) - filter.sortKey(b)
              : displayValue(filter, a, t, locale).localeCompare(
                  displayValue(filter, b, t, locale),
                  locale,
                ),
          );
          return { filter, values, available };
        })
        .filter(
          (group) =>
            group.values.length > 1 || (selected[group.filter.id]?.length ?? 0) > 0,
        ),
    [filters, items, selected, t, locale],
  );
  const activeChips = filters.flatMap((filter) =>
    (selected[filter.id] ?? []).map((value) => ({
      filterId: filter.id,
      value,
      label: displayValue(filter, value, t, locale),
    })),
  );
  const activeAnyFilters = filters.filter(
    (filter) =>
      filter.includeAny &&
      includeAny[filter.id] &&
      (selected[filter.id]?.length ?? 0) > 0,
  );
  const activeCount = activeChips.length + activeAnyFilters.length;
  const term = normalizeSearchText(search.trim());
  const matchingGroups = groups.filter(
    ({ filter, values }) =>
      !term ||
      normalizeSearchText(t(filter.label)).includes(term) ||
      values.some((value) =>
        normalizeSearchText(
          `${displayValue(filter, value, t, locale)} ${value}`,
        ).includes(term),
      ),
  );
  const sourceGroup = matchingGroups.find((group) => group.filter.id === 'source');
  const coreValues =
    sourceGroup?.values.filter((value) => value !== HOMEBREW_SOURCE) ?? [];
  const homebrewValues =
    sourceGroup?.values.filter((value) => value === HOMEBREW_SOURCE) ?? [];
  const renderGroup = (group: FilterGroup, hideLabel = false) => (
    <FacetSection
      key={group.filter.id + String(hideLabel) + group.values.join('|')}
      group={group}
      selected={selected[group.filter.id] ?? []}
      counts={counts.get(group.filter.id)!}
      onToggle={(value) => onToggle(group.filter.id, value)}
      onSet={(values) => onSetFilter(group.filter.id, values)}
      {...(group.filter.includeAny
        ? {
            includeAny: Boolean(includeAny[group.filter.id]),
            onToggleIncludeAny: () => onToggleIncludeAny?.(group.filter.id),
          }
        : {})}
      search={search}
      hideLabel={hideLabel}
      t={t}
      locale={locale}
    />
  );
  return (
    <div className="border-b border-ink-700">
      <div className="flex items-center gap-2 px-3 py-2">
        {groups.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t('compendium.filters.button')}
            {activeCount > 0 && <span className="badge tabular-nums">{activeCount}</span>}
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <Select
            size="sm"
            value={sortField}
            onChange={(event) => onSortField(event.target.value)}
            aria-label={t('compendium.sort.label')}
            className="max-w-40 flex-1 truncate"
          >
            <option value="name">{t('compendium.sort.byName')}</option>
            {sortOptions.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {t(filter.label)}
              </option>
            ))}
          </Select>
          <IconButton
            variant="ghost"
            size="sm"
            label={t(
              sortDir === 'asc'
                ? 'compendium.sort.ascending'
                : 'compendium.sort.descending',
            )}
            title={t('compendium.sort.toggleDirection')}
            onClick={onToggleSortDir}
          >
            {sortDir === 'asc' ? (
              <ArrowUpNarrowWide size={14} />
            ) : (
              <ArrowDownWideNarrow size={14} />
            )}
          </IconButton>
          {activeCount > 0 && (
            <>
              <IconButton
                variant="ghost"
                size="sm"
                label={t('compendium.filters.toggleSummary')}
                aria-pressed={summaryOpen}
                onClick={() => setSummaryOpen(!summaryOpen)}
              >
                <SlidersHorizontal size={14} />
              </IconButton>
              <IconButton
                variant="ghost"
                size="sm"
                label={t('compendium.filters.resetFilters')}
                onClick={onClear}
              >
                <RotateCcw size={14} />
              </IconButton>
            </>
          )}
          <IconButton
            variant="ghost"
            size="sm"
            label={t('compendium.filters.jumpRandom')}
            title={t('compendium.filters.randomEntry')}
            onClick={onRandom}
            disabled={resultCount === 0}
          >
            <Shuffle size={14} />
          </IconButton>
        </div>
      </div>
      {summaryOpen && activeCount > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-ink-800 px-3 py-2">
          {activeChips.map((chip) => (
            <ToggleChip
              key={`${chip.filterId}:${chip.value}`}
              active
              onClick={() => onToggle(chip.filterId, chip.value)}
              className="max-w-full gap-1 whitespace-normal text-left"
            >
              <span>{chip.label}</span>
              <X size={12} aria-hidden="true" />
            </ToggleChip>
          ))}
          {activeAnyFilters.map((filter) => (
            <ToggleChip
              key={filter.id}
              active
              onClick={() => onToggleIncludeAny?.(filter.id)}
              className="gap-1"
            >
              {t('compendium.filters.includeAny')}
              <X size={12} />
            </ToggleChip>
          ))}
        </div>
      )}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('compendium.filters.dialog')}
          ref={dialogRef}
          tabIndex={-1}
          onClick={() => setModalOpen(false)}
          className="dialog-overlay"
        >
          <div className="dialog-panel" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-col gap-2 border-b border-ink-700 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <SearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onClear={() => setSearch('')}
                  placeholder={t('compendium.filters.searchPlaceholder')}
                  label={t('compendium.filters.searchAria')}
                  clearLabel={t('common.clearSearch')}
                />
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={t('compendium.filters.close')}
                  onClick={() => setModalOpen(false)}
                >
                  <X size={16} />
                </IconButton>
              </div>
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={onClear}
                >
                  {t('compendium.filters.clearAll')}
                </Button>
              )}
            </div>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4" id={id}>
              {matchingGroups
                .filter((group) => group.filter.id !== 'source')
                .map((group) => renderGroup(group))}
              {sourceGroup && (
                <div className="flex flex-col gap-2">
                  <p className="field-label">{t('compendium.filters.sourceHeading')}</p>
                  {coreValues.length > 0 && (
                    <>
                      <p className="text-xs text-ink-400">
                        {t('compendium.filters.coreSupplements')}
                      </p>
                      {renderGroup({ ...sourceGroup, values: coreValues }, true)}
                    </>
                  )}
                  {homebrewValues.length > 0 && (
                    <>
                      <p className="text-xs text-ink-400">
                        {t('compendium.homebrewLabel')}
                      </p>
                      {renderGroup({ ...sourceGroup, values: homebrewValues }, true)}
                    </>
                  )}
                </div>
              )}
              {matchingGroups.length === 0 && (
                <p className="empty-state">{t('compendium.catalog.noFilterMatches')}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 p-3">
              <p role="status" aria-atomic="true" className="text-sm text-ink-300">
                {t('compendium.catalog.resultCount', { count: resultCount })}
              </p>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                {t('compendium.catalog.showResults', { count: resultCount })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
