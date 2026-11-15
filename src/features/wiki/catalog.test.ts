import { describe, expect, it } from 'vitest';
import { wikiCatalog, wikiPageCount } from './catalog';
import type { WikiPage } from './types';

const entry = (
  slug: string,
  title: string,
  html: string,
  category = 'Postacie',
): WikiPage => ({ campaignId: 'test', slug, title, html, category });

describe('wiki catalog', () => {
  const pages = [
    entry('z', 'Żółw', '<p>Głód Smoka &amp; Słońce</p>'),
    entry('b', 'Aconeth', '<p>Elfka</p>'),
    entry('a', 'Aconeth', '<p>Elfka</p>'),
    entry('empty', 'Home', '<p>Nothing here</p>'),
    entry('town', 'Miasto', '<p>Forteca</p>', 'Lokacje'),
  ];
  it('normalizes titles and article text while omitting starter placeholders', () => {
    expect(wikiCatalog(pages, 'pl', '  ZOLW ', '')).toHaveLength(1);
    expect(wikiCatalog(pages, 'en', 'slonce', '')[0]?.slug).toBe('z');
    expect(wikiCatalog(pages, 'pl', '', '').map((page) => page.slug)).toEqual([
      'town',
      'a',
      'b',
      'z',
    ]);
    expect(wikiCatalog(pages, 'pl', 'missing', '')).toEqual([]);
    expect(wikiCatalog(pages, 'pl', '', 'Lokacje')[0]?.slug).toBe('town');
    expect(wikiCatalog(pages, 'pl', 'Elfka', 'Lokacje')).toEqual([]);
  });
  it('selects localized plural forms', () => {
    expect(wikiPageCount(1, 'en')).toBe('wiki.pageCount.one');
    expect(wikiPageCount(2, 'en')).toBe('wiki.pageCount.other');
    expect(wikiPageCount(1, 'pl')).toBe('wiki.pageCount.one');
    expect(wikiPageCount(2, 'pl')).toBe('wiki.pageCount.few');
    expect(wikiPageCount(12, 'pl')).toBe('wiki.pageCount.many');
  });
});
