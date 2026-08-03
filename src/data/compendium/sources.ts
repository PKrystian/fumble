import data from '@/data/generated/sources.json';
import booksIndex from '@/data/generated/books.json';
import plBooks from '@/data/generated/pl/books.json';
import plSources from '@/data/generated/pl/sources.json';
import type { Locale } from '@/i18n/locales';
import type { BookIndexEntry } from './types';

const names = data as Record<string, string>;
const plBookNames = plBooks as Record<string, { name?: string }>;

const plSourceNames: Record<string, string> = { ...plSources };

const ranks = new Map<string, number>();
for (const book of booksIndex as BookIndexEntry[]) {
  ranks.set(book.source, Date.parse(book.published!));
  const translatedName = plBookNames[book.id]?.name;
  if (translatedName) plSourceNames[book.source] = translatedName;
}

export function sourceName(code: string, locale?: Locale): string {
  const sourceNames = locale === 'pl' ? plSourceNames : names;
  return sourceNames[code] ?? code;
}

export function localizedBookName(entry: BookIndexEntry, locale?: Locale): string {
  if (locale === 'pl') {
    return plBookNames[entry.id]?.name ?? entry.name;
  }
  return entry.name;
}

export function sourceRank(code: string): number {
  return ranks.get(code) ?? 0;
}

export type Edition = '2024' | '2014';

const EDITION_CUTOFF_TS = Date.parse('2024-09-17');

export function sourceEdition(code: string): Edition {
  return sourceRank(code) >= EDITION_CUTOFF_TS ? '2024' : '2014';
}

export function isUaSource(code: string): boolean {
  return code.startsWith('UA');
}

const CORE_2024 = new Set(['XPHB', 'XDMG', 'XMM']);

export function sourceAbbrev(code: string): string {
  if (CORE_2024.has(code)) return `${code.slice(1)}'24`;
  if (CORE_2024.has(`X${code}`)) return `${code}'14`;
  return code;
}
