import { describe, expect, it } from 'vitest';
import { isBookChapterIndexable, isBookChapterNameIndexable } from './chapterSeo';

describe('book chapter SEO', () => {
  it('keeps populated chapters indexable', () => {
    expect(isBookChapterNameIndexable(undefined)).toBe(true);
    expect(isBookChapterIndexable(undefined)).toBe(true);
    expect(isBookChapterIndexable('Introduction')).toBe(true);
    expect(
      isBookChapterIndexable({ name: 'Introduction', entries: ['Chapter text'] }),
    ).toBe(true);
    expect(isBookChapterIndexable({ name: 'Appendix', headers: ['Map'] })).toBe(true);
  });

  it('excludes credits chapters from search indexes', () => {
    expect(isBookChapterNameIndexable('Credits')).toBe(false);
    expect(isBookChapterNameIndexable('Adventure Credits')).toBe(false);
    expect(isBookChapterNameIndexable('Kredyty')).toBe(false);
    expect(isBookChapterIndexable({ name: 'Credits', entries: ['Names'] })).toBe(false);
  });
});
