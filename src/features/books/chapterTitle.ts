import type { Locale } from '@/i18n/locales';

interface ChapterTitleOverride {
  en: string;
  pl: string;
}

const CHAPTER_TITLE_OVERRIDES: Record<string, Record<number, ChapterTitleOverride>> = {
  erlw: {
    3: {
      en: 'Chapter 1: Character Creation - Artificer',
      pl: 'Rozdział 1: Tworzenie postaci - Rzemieślnik',
    },
  },
  wbtw: {
    4: {
      en: 'Yon',
      pl: 'Tam dalej',
    },
  },
};

export function bookChapterTitle(
  bookId: string,
  chapter: unknown,
  index: number,
  locale: Locale,
  fallback: string,
): string {
  const override = CHAPTER_TITLE_OVERRIDES[bookId]?.[index];
  if (override) return override[locale];
  if (
    chapter &&
    typeof chapter === 'object' &&
    !Array.isArray(chapter) &&
    typeof (chapter as { name?: unknown }).name === 'string'
  ) {
    return (chapter as { name: string }).name;
  }
  return fallback;
}

export function normalizeBookChapterTitles<T>(
  bookId: string,
  chapters: T[],
  locale: Locale,
): T[] {
  return chapters.map((chapter, index) => {
    const title = bookChapterTitle(bookId, chapter, index, locale, '');
    if (
      !title ||
      typeof chapter !== 'object' ||
      chapter === null ||
      Array.isArray(chapter) ||
      !('name' in chapter) ||
      (chapter as { name?: unknown }).name === title
    ) {
      return chapter;
    }
    return { ...chapter, name: title } as T;
  });
}
