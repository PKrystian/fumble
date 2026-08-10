import { describe, expect, it } from 'vitest';
import { bookChapterTitle, normalizeBookChapterTitles } from './chapterTitle';

describe('book chapter titles', () => {
  it('corrects the duplicate Eberron chapter title in both locales', () => {
    const chapter = { type: 'section', name: 'Chapter 1: Character Creation' };
    expect(bookChapterTitle('erlw', chapter, 3, 'en', 'Fallback')).toBe(
      'Chapter 1: Character Creation - Artificer',
    );
    expect(bookChapterTitle('erlw', chapter, 3, 'pl', 'Fallback')).toBe(
      'Rozdział 1: Tworzenie postaci - Rzemieślnik',
    );
  });

  it('keeps the three distinct Witchlight locations distinct in Polish', () => {
    expect(bookChapterTitle('wbtw', { name: 'Yon' }, 4, 'pl', 'Fallback')).toBe(
      'Tam dalej',
    );
  });

  it('keeps ordinary chapter data and normalizes corrected entries', () => {
    const chapters = [
      { type: 'section', name: 'Introduction' },
      { type: 'section', name: 'Chapter 1: Character Creation' },
      { type: 'section', name: 'Chapter 1: Character Creation - Dragonmarks' },
      { type: 'section', name: 'Chapter 1: Character Creation' },
    ];
    expect(bookChapterTitle('other', chapters[0], 0, 'en', 'Fallback')).toBe(
      'Introduction',
    );
    expect(bookChapterTitle('other', undefined, 0, 'en', 'Fallback')).toBe('Fallback');
    expect(normalizeBookChapterTitles('erlw', chapters, 'en')[3]).toEqual({
      type: 'section',
      name: 'Chapter 1: Character Creation - Artificer',
    });
  });
});
