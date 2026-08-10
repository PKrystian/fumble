const NON_INDEXABLE_CHAPTER_NAMES = new Set([
  'credits',
  'adventure credits',
  'kredyty',
  'kredyty przygody',
]);

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
