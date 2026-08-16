import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import type { CategoryFilter } from './categories';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export type SortDir = 'asc' | 'desc';

const filterValuesCache = new WeakMap<
  CategoryFilter,
  WeakMap<CompendiumEntryBase, string[]>
>();

export function normalizeFilterValue(filter: CategoryFilter, value: string): string {
  return filter.normalizeValue?.(value) ?? value;
}

export function filterValuesFor(
  filter: CategoryFilter,
  item: CompendiumEntryBase,
): string[] {
  const cachedItems =
    filterValuesCache.get(filter) ?? new WeakMap<CompendiumEntryBase, string[]>();
  filterValuesCache.set(filter, cachedItems);
  const cached = cachedItems.get(item);
  if (cached) return cached;
  const values = filter
    .valuesFor(item)
    .map((value) => normalizeFilterValue(filter, value));
  cachedItems.set(item, values);
  return values;
}

export function matchesFilters(
  item: CompendiumEntryBase,
  filters: CategoryFilter[],
  selected: Record<string, string[]>,
  includeAny: Record<string, boolean> = {},
): boolean {
  return filters.every((filter) => {
    const chosen = selected[filter.id];
    if (!chosen || chosen.length === 0) return filter.defaultVisible?.(item) ?? true;
    return filterValuesFor(filter, item).some(
      (value) => chosen.includes(value) || (includeAny[filter.id] && value === 'Any'),
    );
  });
}

export function displayValue(
  filter: CategoryFilter,
  value: string,
  t: TranslateFn,
  locale: Locale,
): string {
  if (filter.labelFor) return filter.labelFor(value, locale);
  const valueLabelKey = filter.valueLabelKey?.(value);
  if (valueLabelKey) return t(valueLabelKey);
  if (value === 'Cantrip') return t('compendium.filters.cantrip');
  const levelMatch = /^Level (\d+)$/.exec(value);
  if (levelMatch) return t('compendium.filters.levelN', { level: levelMatch[1]! });
  if (value === 'Yes') return t('compendium.filters.yes');
  if (value === 'No') return t('compendium.filters.no');
  return value;
}

function compareByFilter(
  a: CompendiumEntryBase,
  b: CompendiumEntryBase,
  filter: CategoryFilter,
  t: TranslateFn,
  locale: Locale,
): number {
  const av = filterValuesFor(filter, a);
  const bv = filterValuesFor(filter, b);
  if (av.length === 0 || bv.length === 0) {
    if (av.length === 0 && bv.length === 0) return 0;
    return av.length === 0 ? 1 : -1;
  }
  if (filter.sortKey) {
    const an = Math.min(...av.map((v) => filter.sortKey!(v)));
    const bn = Math.min(...bv.map((v) => filter.sortKey!(v)));
    return an - bn;
  }
  const as = av
    .map((v) => displayValue(filter, v, t, locale))
    .sort((x, y) => x.localeCompare(y, locale))[0]!;
  const bs = bv
    .map((v) => displayValue(filter, v, t, locale))
    .sort((x, y) => x.localeCompare(y, locale))[0]!;
  return as.localeCompare(bs, locale);
}

export function compareItems(
  a: CompendiumEntryBase,
  b: CompendiumEntryBase,
  sortField: string,
  sortDir: SortDir,
  filters: CategoryFilter[],
  t: TranslateFn,
  locale: Locale,
): number {
  const dir = sortDir === 'asc' ? 1 : -1;
  const filter =
    sortField === 'name' ? undefined : filters.find((f) => f.id === sortField);
  if (filter) {
    const primary = compareByFilter(a, b, filter, t, locale);
    if (primary !== 0) return primary * dir;
    return a.name.localeCompare(b.name, locale);
  }
  return a.name.localeCompare(b.name, locale) * dir;
}
