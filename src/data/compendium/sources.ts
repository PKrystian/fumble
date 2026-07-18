import data from '@/data/generated/sources.json';
import booksIndex from '@/data/generated/books.json';
import type { BookIndexEntry } from './types';

const names = data as Record<string, string>;

const ranks = new Map<string, number>();
for (const book of booksIndex as BookIndexEntry[]) {
  ranks.set(book.source, book.published ? Date.parse(book.published) : 0);
}

export function sourceName(code: string): string {
  return names[code] ?? code;
}

export function sourceRank(code: string): number {
  return ranks.get(code) ?? 0;
}

const CORE_2024 = new Set(['XPHB', 'XDMG', 'XMM']);

export function sourceAbbrev(code: string): string {
  if (CORE_2024.has(code)) return `${code.slice(1)}'24`;
  if (CORE_2024.has(`X${code}`)) return `${code}'14`;
  return code;
}
