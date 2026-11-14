import type { Entry } from '@/data/compendium/entry';
import {
  bookAnchorName,
  findBookEntry,
  matchesBookEntry,
  type ReaderAnchor,
} from './readerAnchor';

export function chapterForAnchor(chapters: Entry[], anchor: ReaderAnchor): number {
  if (anchor.page !== null) {
    let nearest = -1;
    let result = 0;
    chapters.forEach((chapter, index) => {
      const page = typeof chapter === 'object' ? chapter.page : undefined;
      if (typeof page === 'number' && page <= anchor.page! && page > nearest) {
        nearest = page;
        result = index;
      }
    });
    return result;
  }

  const name = anchor.name ? bookAnchorName(anchor.name) : '';
  if (!name && !anchor.section) return 0;
  const index = chapters.findIndex((chapter) =>
    findBookEntry(chapter, (entry) =>
      anchor.section ? entry.id === anchor.section : matchesBookEntry(entry, name),
    ),
  );
  return index === -1 ? 0 : index;
}

export function resolveReaderTarget(
  root: HTMLElement,
  original: Entry | undefined,
  anchor: ReaderAnchor,
) {
  const name = anchor.name ? bookAnchorName(anchor.name) : '';
  const originalEntry = name
    ? findBookEntry(original, (entry) => matchesBookEntry(entry, name))
    : undefined;
  const section = anchor.section ?? originalEntry?.id;
  const exact =
    typeof section === 'string'
      ? [...root.querySelectorAll<HTMLElement>('[data-entry-id]')].find(
          (entry) => entry.dataset.entryId === section,
        )
      : undefined;
  const headings = 'h2, h3, h4, h5, h6';
  const named = name
    ? [...root.querySelectorAll<HTMLElement>(headings)].find(
        (heading) => bookAnchorName(heading.textContent ?? '') === name,
      )
    : undefined;
  if (exact || named) {
    return {
      target:
        exact?.querySelector<HTMLElement>(`:scope > :is(${headings})`) ?? exact ?? named,
      section: exact?.dataset.entryId ?? named?.parentElement?.dataset.entryId,
    };
  }

  const reference = name
    ? [...root.querySelectorAll<HTMLElement>('[data-entry-reference]')].find(
        (entry) =>
          entry.dataset.entryReference === name ||
          bookAnchorName(entry.textContent ?? '') === name,
      )
    : undefined;
  if (reference) return { target: reference, notice: 'reference' as const };

  if (anchor.page !== null) {
    let nearest: HTMLElement | undefined;
    let page = -1;
    for (const entry of root.querySelectorAll<HTMLElement>('[data-page]')) {
      const number = Number(entry.dataset.page);
      if (number <= anchor.page && number > page) {
        nearest = entry;
        page = number;
      }
    }
    if (nearest) {
      return {
        target:
          nearest.querySelector<HTMLElement>(`:scope > :is(${headings})`) ?? nearest,
        section: nearest.dataset.entryId,
        ...(page !== anchor.page || name ? { notice: 'page' as const } : {}),
      };
    }
  }

  return {
    target: root.querySelector<HTMLElement>(headings) ?? root,
    ...(anchor.name || anchor.section || anchor.page !== null
      ? { notice: 'chapter' as const }
      : {}),
  };
}
