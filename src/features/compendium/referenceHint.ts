import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { Entry } from '@/data/compendium/entry';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import { translate } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { fumbleHomebrewItems } from '@/features/homebrew/fumbleHomebrew';
import {
  homebrewToItem,
  useHomebrewStore,
  type HomebrewEntry,
} from '@/features/homebrew/store';
import { getCategory } from './categories';

export interface ReferenceHint {
  name: string;
  englishName?: string;
  subtitle: string;
  description: string;
}

export interface ResolvedReference {
  item: CompendiumEntryBase;
  slug: string;
}

const cache = new Map<string, Promise<CompendiumEntryBase[]>>();

function loadItems(categoryId: string, locale: string): Promise<CompendiumEntryBase[]> {
  const cacheKey = `${locale}/${categoryId}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const category = getCategory(categoryId);
  const promise = category
    ? loadLocalizedItems(categoryId, category.load, locale)
    : Promise.resolve([]);
  cache.set(cacheKey, promise);
  return promise;
}

function supplementalItems(categoryId: string, locale: Locale): CompendiumEntryBase[] {
  const fumbleItems = fumbleHomebrewItems(locale).filter(
    (item) => item.category === categoryId,
  );
  const homebrewEntries = useHomebrewStore.getState().entries;
  const homebrewItems = homebrewEntries
    .filter(
      (entry): entry is Exclude<HomebrewEntry, { kind: 'subclass' }> =>
        entry.kind !== 'subclass' && entry.category === categoryId,
    )
    .map((entry) => homebrewToItem(entry, locale, homebrewEntries));
  return [...fumbleItems, ...homebrewItems];
}

async function loadReferenceItems(
  categoryId: string,
  locale: Locale,
  source?: string,
): Promise<CompendiumEntryBase[]> {
  const items = await loadItems(categoryId, locale);
  const allItems = [...items, ...supplementalItems(categoryId, locale)];
  const normalizedSource = source?.toLowerCase();
  return normalizedSource
    ? allItems.filter((item) => item.source.toLowerCase() === normalizedSource)
    : allItems;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesReference(
  item: CompendiumEntryBase,
  slug: string,
  label: string,
): boolean {
  if (item.id === slug) return true;
  const names = [item.name, item.englishName].filter((value): value is string =>
    Boolean(value),
  );
  return names.some(
    (value) => slugify(value) === slug || normalized(value) === normalized(label),
  );
}

export async function resolveReference(
  categoryId: string,
  slug: string,
  locale: Locale,
  label: string,
  source?: string,
): Promise<ResolvedReference | null> {
  let items: CompendiumEntryBase[];
  try {
    items = await loadReferenceItems(categoryId, locale, source);
  } catch {
    return null;
  }
  const item = items.find((candidate) => matchesReference(candidate, slug, label));
  return item ? { item, slug: item.id } : null;
}

export async function loadReferenceName(
  categoryId: string,
  slug: string,
  locale: string,
  label: string,
  source?: string,
): Promise<string | null> {
  if (locale === 'en') return null;
  const referenceLocale = locale as Locale;
  const [localized, english] = await Promise.all([
    loadReferenceItems(categoryId, referenceLocale, source),
    loadReferenceItems(categoryId, 'en', source),
  ]);
  const englishItem = english.find(
    (item) => item.id === slug && item.name.toLowerCase() === label.toLowerCase(),
  );
  if (!englishItem) return null;
  const localizedName = localized.find((i) => i.id === slug)?.name;
  return localizedName && localizedName !== englishItem.name ? localizedName : null;
}

function stripMarkup(value: string): string {
  return value
    .replace(/\{@\w+\s*([^|}]*)[^}]*\}/g, (_, text: string) => text.trim())
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(entries: Entry[]): string {
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const text = stripMarkup(entry);
      if (text) return text;
    } else if (entry && typeof entry === 'object') {
      const nested = firstText(entry.entries ?? (entry.entry ? [entry.entry] : []));
      if (nested) return nested;
    }
  }
  return '';
}

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

interface WithEntries {
  entries?: Entry[];

  traits?: Array<{ entries?: Entry[] }>;
  actions?: Array<{ entries?: Entry[] }>;
}

function describableEntries(item: CompendiumEntryBase): Entry[] {
  const it = item as CompendiumEntryBase & WithEntries;
  if (it.entries?.length) return it.entries;
  const sections = [...(it.traits ?? []), ...(it.actions ?? [])];
  return sections.flatMap((section) => section.entries ?? []);
}

export async function loadReferenceHint(
  categoryId: string,
  slug: string,
  locale: string,
  source?: string,
): Promise<ReferenceHint | null> {
  const resolved = await resolveReference(
    categoryId,
    slug,
    locale as Locale,
    slug,
    source,
  );
  if (!resolved) return null;
  const { item } = resolved;

  const category = getCategory(categoryId);
  const itemSubtitle = (item as CompendiumEntryBase & { subtitle?: unknown }).subtitle;
  const subtitle =
    typeof itemSubtitle === 'string'
      ? itemSubtitle
      : category!.subtitle(item, (key, vars) => translate(locale as Locale, key, vars));
  const description = truncate(firstText(describableEntries(item)));
  return {
    name: item.name,
    ...(item.englishName ? { englishName: item.englishName } : {}),
    subtitle,
    description,
  };
}
