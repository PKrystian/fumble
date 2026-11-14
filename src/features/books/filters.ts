import type { BookIndexEntry } from '@/data/compendium/types';
import { localizedBookName } from '@/data/compendium/sources';
import type { Locale } from '@/i18n/locales';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const CORE_SOURCE_RANK: Record<string, number> = {
  XPHB: 0,
  PHB: 0,
  XDMG: 1,
  DMG: 1,
  XMM: 2,
  MM: 2,
};

export function typeLabel(group: string, t: TranslateFn): string {
  const key = `books.types.${group}`;
  const value = t(key);
  return value === key ? group : value;
}

export function sortDocs(docs: BookIndexEntry[]): BookIndexEntry[] {
  return [...docs].sort((a, b) => {
    const ra = CORE_SOURCE_RANK[a.source] ?? 99;
    const rb = CORE_SOURCE_RANK[b.source] ?? 99;
    if (ra !== rb) return ra - rb;
    const dateDiff = (b.published ?? '').localeCompare(a.published ?? '');
    return dateDiff !== 0 ? dateDiff : a.name.localeCompare(b.name);
  });
}

export const BOOK_SORTS = ['grouped', 'title', 'newest', 'oldest'] as const;
export type BookSort = (typeof BOOK_SORTS)[number];

export function sortCatalog(
  docs: BookIndexEntry[],
  sort: Exclude<BookSort, 'grouped'>,
  locale: Locale,
): BookIndexEntry[] {
  const byTitle = (a: BookIndexEntry, b: BookIndexEntry) =>
    localizedBookName(a, locale).localeCompare(localizedBookName(b, locale), locale) ||
    a.id.localeCompare(b.id);
  return [...docs].sort((a, b) => {
    if (sort === 'title') return byTitle(a, b);
    if (!a.published || !b.published)
      return Number(!a.published) - Number(!b.published) || byTitle(a, b);
    const dates = a.published.localeCompare(b.published);
    return (sort === 'newest' ? -dates : dates) || byTitle(a, b);
  });
}
