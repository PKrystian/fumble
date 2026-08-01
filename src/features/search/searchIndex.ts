import type { CompendiumEntryBase } from '@/data/compendium/types';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import { categories, getCategory } from '@/features/compendium/categories';
import {
  homebrewToItem,
  type HomebrewEntry,
  type HomebrewImportedEntry,
  type HomebrewManualEntry,
} from '@/features/homebrew/store';
import { applyContentMode } from '@/features/compendium/contentFilter';
import type { ContentMode } from '@/features/ui/contentModeStore';
import type { WikiData } from '@/features/wiki/types';
import { translate } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { normalizeSearchText } from '@/data/compendium/searchText';

export type SearchKind = 'compendium' | 'homebrew' | 'wiki';

export interface SearchResult {
  kind: SearchKind;
  id: string;
  name: string;
  englishName?: string;
  subtitle: string;
  categoryLabel: string;
  to: string;
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function translator(locale: Locale): TranslateFn {
  return (key, vars) => translate(locale, key, vars);
}

function toResult(
  kind: SearchKind,
  item: CompendiumEntryBase,
  categoryId: string,
  subtitle: string,
  categoryLabel: string,
): SearchResult {
  return {
    kind,
    id: item.id,
    name: item.name,
    ...(item.englishName ? { englishName: item.englishName } : {}),
    subtitle,
    categoryLabel,
    to: `/compendium/${categoryId}/${item.id}`,
  };
}

interface CategoryIndex {
  id: string;
  label: string;
  items: CompendiumEntryBase[];
}

export interface SearchIndex {
  categories: CategoryIndex[];
  wiki: SearchResult[];
}

async function buildFallbackIndex(locale: Locale, t: TranslateFn): Promise<SearchIndex> {
  const categoryData = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      label: t(`compendium.categories.${category.id}`),
      items: await loadLocalizedItems(category.id, category.load, locale),
    })),
  );
  const wiki = await import('@/data/generated/wiki.json')
    .then((module) => (module.default as unknown as WikiData).pages)
    .catch(() => []);
  return {
    categories: categoryData,
    wiki: wiki.map((page) => ({
      kind: 'wiki',
      id: page.slug,
      name: page.title,
      subtitle: page.category,
      categoryLabel: t('nav.wiki'),
      to: `/wiki/${page.slug}`,
    })),
  };
}

const indexCache = new Map<Locale, Promise<SearchIndex>>();

async function buildIndex(locale: Locale): Promise<SearchIndex> {
  const t = translator(locale);
  const response = await fetch(
    `${import.meta.env.BASE_URL}search-index-${locale}.json`,
  ).catch(() => null);
  if (!response?.ok) return buildFallbackIndex(locale, t);
  const raw = await response
    .json()
    .then(
      (value) =>
        value as {
          categories: Array<{ id: string; items: CompendiumEntryBase[] }>;
          wiki: Array<{ slug: string; title: string; category?: string }>;
        },
    )
    .catch(() => null);
  if (!raw) return buildFallbackIndex(locale, t);
  return {
    categories: raw.categories.map((category) => ({
      ...category,
      label: t(`compendium.categories.${category.id}`),
    })),
    wiki: raw.wiki.map((page) => ({
      kind: 'wiki',
      id: page.slug,
      name: page.title,
      subtitle: page.category ?? '',
      categoryLabel: t('nav.wiki'),
      to: `/wiki/${page.slug}`,
    })),
  };
}

export function loadSearchIndex(locale: Locale): Promise<SearchIndex> {
  const cached = indexCache.get(locale);
  if (cached) return cached;
  const promise = buildIndex(locale);
  indexCache.set(locale, promise);
  return promise;
}

export function buildPool(
  index: SearchIndex,
  mode: ContentMode,
  locale: Locale,
): SearchResult[] {
  const t = translator(locale);
  const compendium = index.categories.flatMap((cat) => {
    const category = getCategory(cat.id);
    return applyContentMode(cat.items, mode).map((item) =>
      toResult(
        'compendium',
        item,
        cat.id,
        category ? category.subtitle(item, t) : '',
        cat.label,
      ),
    );
  });
  return [...compendium, ...index.wiki];
}

export function buildHomebrewResults(
  entries: HomebrewEntry[],
  locale: Locale,
): SearchResult[] {
  const t = translator(locale);
  return entries
    .filter(
      (entry): entry is HomebrewManualEntry | HomebrewImportedEntry =>
        entry.kind !== 'subclass',
    )
    .map((entry) => {
      const item = homebrewToItem(entry, locale, entries);
      const category = getCategory(entry.category);
      const categoryLabel = category
        ? t(`compendium.categories.${category.id}`)
        : t('nav.homebrew');
      const subtitle = item.subtitle || (category ? category.subtitle(item, t) : '');
      return toResult('homebrew', item, entry.category, subtitle, categoryLabel);
    });
}

export function scoreResult(result: SearchResult, term: string): number {
  const name = normalizeSearchText(result.name);
  const english = result.englishName ? normalizeSearchText(result.englishName) : '';
  const normalizedTerm = normalizeSearchText(term);
  if (name === normalizedTerm || english === normalizedTerm) return 100;
  if (name.startsWith(normalizedTerm) || english.startsWith(normalizedTerm)) return 80;
  if (
    ` ${name}`.includes(` ${normalizedTerm}`) ||
    ` ${english}`.includes(` ${normalizedTerm}`)
  )
    return 60;
  if (name.includes(normalizedTerm) || english.includes(normalizedTerm)) return 40;
  return 0;
}

export function searchResults(
  pool: SearchResult[],
  query: string,
  limit = 50,
): SearchResult[] {
  const term = normalizeSearchText(query.trim());
  if (!term) return [];
  const scored: Array<{ result: SearchResult; score: number }> = [];
  for (const result of pool) {
    const score = scoreResult(result, term);
    if (score > 0) scored.push({ result, score });
  }
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.result.name.length !== b.result.name.length) {
      return a.result.name.length - b.result.name.length;
    }
    return a.result.name.localeCompare(b.result.name);
  });
  return scored.slice(0, limit).map((entry) => entry.result);
}
