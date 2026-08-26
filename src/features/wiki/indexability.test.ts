import { describe, expect, it } from 'vitest';
import { isWikiPageIndexable } from './indexability';

describe('wiki page indexability', () => {
  it('keeps pages with meaningful content indexable', () => {
    expect(isWikiPageIndexable({ html: '<p>A useful campaign note.</p>' })).toBe(true);
  });

  it('excludes empty and placeholder pages', () => {
    expect(isWikiPageIndexable({ html: '' })).toBe(false);
    expect(isWikiPageIndexable({ html: '<p>Nothing here</p>' })).toBe(false);
    expect(isWikiPageIndexable({ html: '<p>Brak treści</p>' })).toBe(false);
    expect(isWikiPageIndexable({ html: null })).toBe(false);
  });
});
