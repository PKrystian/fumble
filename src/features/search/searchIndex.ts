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

async function loadWikiResults(t: TranslateFn): Promise<SearchResult[]> {
  const mod = await import('@/data/generated/wiki.json');
  const data = mod.default as unknown as WikiData;
  const categoryLabel = t('nav.wiki');
  return data.pages.map((page) => ({
    kind: 'wiki',
    id: page.slug,
    name: page.title,
    subtitle: page.category,
    categoryLabel,
    to: `/wiki/${page.slug}`,
  }));
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

const indexCache = new Map<Locale, Promise<SearchIndex>>();

async function buildIndex(locale: Locale): Promise<SearchIndex> {
  const t = translator(locale);
  const cats = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      label: t(`compendium.categories.${category.id}`),
      items: await loadLocalizedItems(category.id, category.load, locale),
    })),
  );
  const wiki = await loadWikiResults(t).catch(() => [] as SearchResult[]);
  return { categories: cats, wiki };
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
      const item = homebrewToItem(entry, locale);
      const category = getCategory(entry.category);
      const categoryLabel = category
        ? t(`compendium.categories.${category.id}`)
        : t('nav.homebrew');
      const subtitle = item.subtitle || (category ? category.subtitle(item, t) : '');
      return toResult('homebrew', item, entry.category, subtitle, categoryLabel);
    });
}

export function scoreResult(result: SearchResult, term: string): number {
  const name = result.name.toLowerCase();
  const english = result.englishName?.toLowerCase() ?? '';
  if (name === term || english === term) return 100;
  if (name.startsWith(term) || english.startsWith(term)) return 80;
  if (` ${name}`.includes(` ${term}`) || ` ${english}`.includes(` ${term}`)) return 60;
  if (name.includes(term) || english.includes(term)) return 40;
  return 0;
}

export function searchResults(
  pool: SearchResult[],
  query: string,
  limit = 50,
): SearchResult[] {
  const term = query.trim().toLowerCase();
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
