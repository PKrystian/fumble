import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { Entry } from '@/data/compendium/entry';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import { translate } from '@/i18n/useT';
import type { Locale } from '@/i18n/locales';
import { getCategory } from './categories';

export interface ReferenceHint {
  name: string;
  subtitle: string;
  description: string;
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

export async function loadReferenceName(
  categoryId: string,
  slug: string,
  locale: string,
  label: string,
): Promise<string | null> {
  if (locale === 'en') return null;
  const [localized, english] = await Promise.all([
    loadItems(categoryId, locale),
    loadItems(categoryId, 'en'),
  ]);
  const englishName = english.find((i) => i.id === slug)?.name;
  if (!englishName || englishName.toLowerCase() !== label.toLowerCase()) return null;
  const localizedName = localized.find((i) => i.id === slug)?.name;
  return localizedName && localizedName !== englishName ? localizedName : null;
}

function stripMarkup(value: string): string {
  return value
    .replace(/\{@\w+\s*([^|}]*)[^}]*\}/g, (_, text: string) => text.trim())
    .replace(/\s+/g, ' ')
    .trim();
}

function firstText(entries: Entry[] | undefined): string {
  if (!entries) return '';
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
): Promise<ReferenceHint | null> {
  const items = await loadItems(categoryId, locale);
  const item = items.find((i) => i.id === slug);
  if (!item) return null;

  const category = getCategory(categoryId);
  const subtitle = category
    ? category.subtitle(item, (key, vars) => translate(locale as Locale, key, vars))
    : '';
  const description = truncate(firstText(describableEntries(item)));
  return { name: item.name, subtitle, description };
}
