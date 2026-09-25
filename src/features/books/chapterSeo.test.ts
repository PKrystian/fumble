import { describe, expect, it } from 'vitest';
import {
  isBookChapterDuplicate,
  isBookChapterIndexable,
  isBookChapterNameIndexable,
} from './chapterSeo';

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

  it('excludes non-canonical duplicate chapters while keeping the canonical route', () => {
    expect(isBookChapterDuplicate('drde-acfas', 0)).toBe(false);
    expect(isBookChapterDuplicate('drde-bd', 0)).toBe(true);
    expect(isBookChapterDuplicate('test-book', 0)).toBe(false);
  });
});
