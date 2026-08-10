import booksIndex from '@/data/generated/books.json';
import plStorylines from '@/data/generated/pl/book-storylines.json';
import type { Entry } from '@/data/compendium/entry';
import type { BookIndexEntry } from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import { bookDataUrl, readBookData } from './dataCompression';
import { normalizeBookChapterTitles } from './chapterTitle';

export const books = (booksIndex as BookIndexEntry[]).filter((b) => b.type === 'book');
export const adventures = (booksIndex as BookIndexEntry[]).filter(
  (b) => b.type === 'adventure',
);

export function getBook(id: string): BookIndexEntry | undefined {
  return (booksIndex as BookIndexEntry[]).find((b) => b.id === id);
}

export function localizedBookStoryline(
  storyline: string | undefined,
  locale: Locale,
): string | undefined {
  if (!storyline || locale !== 'pl') return storyline;
  return plStorylines[storyline as keyof typeof plStorylines] ?? storyline;
}

export interface OutlineNode {
  name: string;
  children: OutlineNode[];
}

export function buildOutline(entries: Entry[] | undefined, maxDepth = 2): OutlineNode[] {
  if (!entries || maxDepth <= 0) return [];
  const nodes: OutlineNode[] = [];
  for (const entry of entries) {
    if (
      typeof entry === 'object' &&
      (entry.type === 'section' || entry.type === 'entries') &&
      typeof entry.name === 'string'
    ) {
      nodes.push({
        name: entry.name,
        children: buildOutline(entry.entries, maxDepth - 1),
      });
    }
  }
  return nodes;
}

export type BookOverlay = Record<string, { name?: string; entries?: Entry[] }>;

const COMPRESSED_BOOK_DATA = import.meta.env.VITE_COMPRESSED_BOOK_DATA === 'true';

function localizeBookEntry(
  entry: Entry,
  chapterIndex: number,
  overlay: BookOverlay,
): Entry {
  if (typeof entry !== 'object') return entry;
  const key = typeof entry.id === 'string' ? `${chapterIndex}:${entry.id}` : undefined;
  const translation = key ? overlay[key] : undefined;
  const merged = translation ? { ...entry, ...translation } : entry;
  return Array.isArray(merged.entries)
    ? {
        ...merged,
        entries: merged.entries.map((c) => localizeBookEntry(c, chapterIndex, overlay)),
      }
    : merged;
}

function localizeChapters(chapters: Entry[], overlay: BookOverlay | undefined): Entry[] {
  if (!overlay) return chapters;
  return chapters.map((chapter, index) => localizeBookEntry(chapter, index, overlay));
}

async function loadBookOverlay(
  entry: BookIndexEntry,
  locale: string,
): Promise<BookOverlay | undefined> {
  if (locale === 'en') return undefined;
  const url = bookDataUrl(
    `${import.meta.env.BASE_URL}data/${locale}/${entry.type}/${entry.id}.json`,
    COMPRESSED_BOOK_DATA,
  );
  try {
    const res = await fetch(url);
    const body = await readBookData<{ data?: BookOverlay }>(res, COMPRESSED_BOOK_DATA);
    return body.data;
  } catch {
    return undefined;
  }
}

const cache = new Map<string, Promise<Entry[]>>();

export function loadBookData(entry: BookIndexEntry, locale: string): Promise<Entry[]> {
  const key = `${locale}/${entry.type}/${entry.id}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const url = bookDataUrl(
    `${import.meta.env.BASE_URL}data/${entry.type}/${entry.id}.json`,
    COMPRESSED_BOOK_DATA,
  );
  const promise = Promise.all([
    fetch(url)
      .then((r) => readBookData<{ data?: Entry[] }>(r, COMPRESSED_BOOK_DATA))
      .then((d: { data?: Entry[] }) => d.data ?? []),
    loadBookOverlay(entry, locale),
  ]).then(
    ([chapters, overlay]) =>
      normalizeBookChapterTitles(
        entry.id,
        localizeChapters(chapters, overlay),
        locale === 'pl' ? 'pl' : 'en',
      ) as Entry[],
  );
  cache.set(key, promise);
  void promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key);
  });
  return promise;
}
