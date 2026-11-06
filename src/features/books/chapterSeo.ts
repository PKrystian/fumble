const NON_INDEXABLE_CHAPTER_NAMES = new Set([
  'credits',
  'adventure credits',
  'kredyty',
  'kredyty przygody',
]);

const NON_CANONICAL_BOOK_CHAPTERS = new Set([
  'drde-bd/0',
  'drde-bts/0',
  'drde-das/0',
  'drde-dotsc/0',
  'drde-fwtvc/0',
  'drde-sd/0',
  'drde-tdon/0',
  'drde-tfv/0',
  'drde-twoo/0',
  'scoee/3',
  'tftyp-dit/0',
  'tftyp-tfof/0',
  'tftyp-wpm/0',
  'tftyp-dit/3',
  'tftyp-tfof/3',
  'tftyp-thsot/3',
  'tftyp-tsc/3',
  'tftyp-toh/3',
  'tftyp-wpm/3',
]);

export function isBookChapterDuplicate(bookId: string, chapterIndex: number): boolean {
  return NON_CANONICAL_BOOK_CHAPTERS.has(`${bookId}/${chapterIndex}`);
}

export function isBookChapterNameIndexable(name: string | undefined): boolean {
  return !NON_INDEXABLE_CHAPTER_NAMES.has(name?.trim().toLocaleLowerCase() ?? '');
}

export function isBookChapterIndexable(chapter: unknown): boolean {
  if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) return true;
  const record = chapter as { name?: unknown; entries?: unknown; headers?: unknown };
  const name = typeof record.name === 'string' ? record.name : undefined;
  if (!isBookChapterNameIndexable(name)) return false;
  return (
    (Array.isArray(record.entries) && record.entries.length > 0) ||
    (Array.isArray(record.headers) && record.headers.length > 0)
  );
}
