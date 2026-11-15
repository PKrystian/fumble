import booksIndex from '@/data/generated/books.json';
import plStorylines from '@/data/generated/pl/book-storylines.json';
import type { Entry } from '@/data/compendium/entry';
import type { BookIndexEntry } from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import { bookDataUrl, readBookData } from './dataCompression';
import { bookChapterTitle } from './chapterTitle';

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
  section?: string;
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
        ...(typeof entry.id === 'string' ? { section: entry.id } : {}),
        children: buildOutline(entry.entries, maxDepth - 1),
      });
    }
  }
  return nodes;
}

export type BookOverlay = Record<string, { name?: string; entries?: Entry[] }>;
export interface BookData {
  chapters: Entry[];
  overlay?: BookOverlay;
  language: Locale;
}

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

export function readBookChapter(
  data: BookData,
  bookId: string,
  index: number,
): Entry | undefined {
  const original = data.chapters[index];
  if (original === undefined || typeof original === 'string') return original;
  const chapter = data.overlay
    ? localizeBookEntry(original, index, data.overlay)
    : original;
  if (typeof chapter === 'string') return chapter;
  const name = bookChapterTitle(bookId, chapter, index, data.language, '');
  return name && name !== chapter.name ? { ...chapter, name } : chapter;
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
    const data = body.data;
    return data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      Object.keys(data).length
      ? data
      : undefined;
  } catch {
    return undefined;
  }
}

const baseCache = new Map<string, Promise<Entry[]>>();
const cache = new Map<string, Promise<BookData>>();

function boundedCache<T>(entries: Map<string, T>, key: string, value: T, limit: number) {
  entries.delete(key);
  entries.set(key, value);
  if (entries.size > limit) entries.delete(entries.keys().next().value!);
  return value;
}

function loadBaseBook(entry: BookIndexEntry): Promise<Entry[]> {
  const key = `${entry.type}/${entry.id}`;
  const existing = baseCache.get(key);
  if (existing) return boundedCache(baseCache, key, existing, 6);
  const url = bookDataUrl(
    `${import.meta.env.BASE_URL}data/${key}.json`,
    COMPRESSED_BOOK_DATA,
  );
  const promise = fetch(url)
    .then((response) => readBookData<{ data?: Entry[] }>(response, COMPRESSED_BOOK_DATA))
    .then(({ data }) => {
      if (data === undefined) return [];
      if (
        !Array.isArray(data) ||
        data.some(
          (chapter) =>
            typeof chapter !== 'string' &&
            (!chapter || typeof chapter !== 'object' || typeof chapter.type !== 'string'),
        )
      )
        throw new Error('Invalid book data');
      return data;
    });
  boundedCache(baseCache, key, promise, 6);
  void promise.then(
    (chapters) => {
      if (!chapters.length && baseCache.get(key) === promise) baseCache.delete(key);
    },
    () => {
      if (baseCache.get(key) === promise) baseCache.delete(key);
    },
  );
  return promise;
}

export function loadBookData(entry: BookIndexEntry, locale: Locale): Promise<BookData> {
  const key = `${locale}/${entry.type}/${entry.id}`;
  const existing = cache.get(key);
  if (existing) return boundedCache(cache, key, existing, 4);
  const promise = Promise.all([loadBaseBook(entry), loadBookOverlay(entry, locale)]).then(
    ([chapters, overlay]): BookData =>
      overlay ? { chapters, overlay, language: 'pl' } : { chapters, language: 'en' },
  );
  boundedCache(cache, key, promise, 4);
  void promise.then(
    ({ chapters, overlay }) => {
      if (
        (!chapters.length || (locale === 'pl' && !overlay)) &&
        cache.get(key) === promise
      )
        cache.delete(key);
    },
    () => {
      if (cache.get(key) === promise) cache.delete(key);
    },
  );
  return promise;
}
