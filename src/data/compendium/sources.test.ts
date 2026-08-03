import { describe, expect, it, vi } from 'vitest';
import {
  isUaSource,
  localizedBookName,
  sourceAbbrev,
  sourceEdition,
  sourceName,
  sourceRank,
} from './sources';
import type { BookIndexEntry } from './types';

describe('compendium sources', () => {
  it('resolves source names with locale fallbacks', () => {
    expect(sourceName('XPHB')).not.toBe('XPHB');
    expect(sourceName('XPHB', 'pl')).not.toBe('XPHB');
    expect(sourceName('TftYP', 'pl')).toBe('Opowieści z Ziewającego Portalu');
    expect(sourceName('UNKNOWN', 'pl')).toBe('UNKNOWN');
    expect(sourceName('UNTRANSLATED', 'pl')).toBe('UNTRANSLATED');
  });

  it('localizes book names when a translation exists', () => {
    const translated: BookIndexEntry = {
      id: 'phb',
      name: "Player's Handbook",
      source: 'PHB',
      published: '2014-08-19',
      group: 'core',
      type: 'book',
      contents: [],
    };
    const fallback: BookIndexEntry = {
      id: 'missing',
      name: 'Missing Book',
      source: 'MISS',
      published: '',
      group: 'other',
      type: 'book',
      contents: [],
    };
    expect(localizedBookName(translated, 'pl')).not.toBe(translated.name);
    expect(localizedBookName(fallback, 'pl')).toBe('Missing Book');
    expect(localizedBookName(translated, 'en')).toBe(translated.name);
  });

  it('ranks known sources and defaults unknown sources', () => {
    expect(sourceRank('XPHB')).toBeGreaterThan(0);
    expect(sourceRank('UNKNOWN')).toBe(0);
    expect(sourceEdition('XPHB')).toBe('2024');
    expect(sourceEdition('PHB')).toBe('2014');
  });

  it('identifies playtest sources and abbreviates core books', () => {
    expect(isUaSource('UA2024')).toBe(true);
    expect(isUaSource('XPHB')).toBe(false);
    expect(sourceAbbrev('XPHB')).toBe("PHB'24");
    expect(sourceAbbrev('PHB')).toBe("PHB'14");
    expect(sourceAbbrev('FRHoF')).toBe('FRHoF');
  });

  it('falls back when a book has no Polish title', async () => {
    vi.resetModules();
    vi.doMock('@/data/generated/books.json', () => ({
      default: [
        {
          id: 'missing-book',
          name: 'Missing Book',
          source: 'MISS',
          published: '2020-01-01',
          group: 'other',
          type: 'book',
          contents: [],
        },
      ],
    }));
    vi.doMock('@/data/generated/pl/books.json', () => ({ default: {} }));
    vi.doMock('@/data/generated/pl/sources.json', () => ({ default: {} }));

    const module = await import('./sources');
    expect(module.sourceName('MISS', 'pl')).toBe('MISS');

    vi.doUnmock('@/data/generated/books.json');
    vi.doUnmock('@/data/generated/pl/books.json');
    vi.doUnmock('@/data/generated/pl/sources.json');
  });
});
