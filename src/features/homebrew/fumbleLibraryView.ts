import type { Entry } from '@/data/compendium/entry';
import { normalizeSearchText } from '@/data/compendium/searchText';
import type { Locale } from '@/i18n/locales';
import { localizePlainText } from '@/features/compendium/markup';
import type { FumbleHomebrewItem } from './fumbleHomebrew';

export const FUMBLE_LIBRARY_PAGE_SIZE = 50;

function firstParagraph(entries: Entry[]): string {
  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry.trim()) return entry;
      continue;
    }
    const text = firstParagraph([
      ...(entry.entries ?? []),
      ...(entry.items ?? []),
      ...(entry.entry ? [entry.entry] : []),
    ]);
    if (text) return text;
  }
  return '';
}

export function libraryExcerpt(item: FumbleHomebrewItem, locale: Locale): string {
  let text = firstParagraph([
    ...(item.intro ?? []),
    ...(Array.isArray(item.lore) ? (item.lore as Entry[]) : []),
    ...(item.entries ?? []),
  ]);
  while (/\{@\w+\s+[^{}]*\}/.test(text)) {
    text = text.replace(/\{@\w+\s+([^{}]*)\}/g, (_, value: string) => {
      const parts = value.split('|');
      return localizePlainText(parts[2] || parts[0]!, locale);
    });
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= 180) return text;
  const boundary = text.lastIndexOf(' ', 180);
  return `${text.slice(0, boundary > 0 ? boundary : 180)}…`;
}

export function librarySearchRank(
  item: FumbleHomebrewItem,
  query: string,
  metadata: string,
): number {
  const term = normalizeSearchText(query.trim());
  if (!term) return 0;
  const names = [item.name, item.englishName ?? ''].map(normalizeSearchText);
  if (names.includes(term)) return 0;
  if (names.some((name) => name.startsWith(term))) return 1;
  if (names.some((name) => name.includes(term))) return 2;
  return normalizeSearchText(metadata).includes(term) ? 3 : -1;
}

export function libraryPage(value: string | null, total: number): number {
  const page = Number(value);
  const lastPage = Math.max(1, Math.ceil(total / FUMBLE_LIBRARY_PAGE_SIZE));
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, lastPage) : 1;
}
