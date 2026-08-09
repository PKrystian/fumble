import { describe, expect, it } from 'vitest';
import { bookAnchorHash, readBookAnchor } from './readerAnchor';

describe('book reader anchors', () => {
  it('builds a hash for page and heading targets', () => {
    expect(bookAnchorHash(12, 'First Chapter')).toBe('#page=12&name=First+Chapter');
    expect(bookAnchorHash(undefined, 'First Chapter')).toBe('#name=First+Chapter');
  });

  it('omits empty or invalid hash values', () => {
    expect(bookAnchorHash(undefined, '   ')).toBe('');
    expect(bookAnchorHash(Number.NaN, undefined)).toBe('');
  });

  it('reads the new hash format before the legacy query format', () => {
    expect(readBookAnchor('#page=12&name=First+Chapter', '?page=4')).toEqual({
      page: 12,
      name: 'First Chapter',
    });
    expect(readBookAnchor('page=8', '')).toEqual({ page: 8, name: null });
  });

  it('keeps legacy query links working and ignores invalid pages', () => {
    expect(readBookAnchor('', '?page=4&name=Legacy')).toEqual({
      page: 4,
      name: 'Legacy',
    });
    expect(readBookAnchor('', '?page=not-a-number')).toEqual({
      page: null,
      name: null,
    });
  });
});
