import type { Entry } from '../../data/compendium/entry';
import { normalizeSearchText } from '../../data/compendium/searchText';
import { stripMarkup } from '../../data/transform/util';
import { isBookSection } from './readingData';

export interface ReaderAnchor {
  page: number | null;
  name: string | null;
  section?: string;
}

export function bookAnchorHash(
  page: number | undefined,
  name: string | undefined,
  section?: string,
): string {
  const params = new URLSearchParams();
  if (page != null && Number.isFinite(page)) params.set('page', String(page));
  if (name?.trim()) params.set('name', name);
  if (isBookSection(section)) params.set('section', section);
  const value = params.toString();
  return value ? `#${value}` : '';
}

export function readBookAnchor(hash: string, search: string): ReaderAnchor {
  const hashValue = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashValue);
  const params =
    hashParams.has('page') || hashParams.has('name') || hashParams.has('section')
      ? hashParams
      : new URLSearchParams(search);
  const rawPage = params.get('page');
  const page = rawPage?.trim() ? Number(rawPage) : null;
  const section = params.get('section');
  return {
    page: page != null && Number.isSafeInteger(page) && page >= 0 ? page : null,
    name: params.get('name'),
    ...(isBookSection(section) ? { section } : {}),
  };
}

export function bookEntryReference(entry: Entry): string | undefined {
  return typeof entry === 'string'
    ? /^\{@(?:spell|item|creature|feat) ([^|}]+)[^}]*\}$/.exec(entry.trim())?.[1]
    : undefined;
}

export function bookAnchorName(name: string): string {
  return normalizeSearchText(stripMarkup(name)).trim();
}

export function findBookEntry(
  chapter: Entry | undefined,
  match: (entry: Exclude<Entry, string>) => boolean,
): Exclude<Entry, string> | undefined {
  if (!chapter || typeof chapter === 'string') return undefined;
  if (match(chapter)) return chapter;
  for (const child of chapter.entries ?? []) {
    const found = findBookEntry(child, match);
    if (found) return found;
  }
  return undefined;
}

export function matchesBookEntry(entry: Exclude<Entry, string>, name: string): boolean {
  return !!entry.name && bookAnchorName(entry.name) === name;
}
