import { describe, expect, it, vi } from 'vitest';

const { loadLocalizedItems } = vi.hoisted(() => ({
  loadLocalizedItems: vi.fn(async () => [
    {
      id: 'fireball',
      name: 'Fireball',
      englishName: 'Kula Ognia',
      source: 'XPHB',
      srd: true,
    },
  ]),
}));

vi.mock('@/data/compendium/overlay', () => ({ loadLocalizedItems }));
vi.mock('@/features/compendium/categories', () => ({
  categories: [{ id: 'spells', load: vi.fn() }],
  getCategory: (id: string) =>
    id === 'spells'
      ? {
          id,
          subtitle: (item: { name: string }) => `Subtitle ${item.name}`,
        }
      : undefined,
}));
vi.mock('@/features/homebrew/store', () => ({
  homebrewToItem: (entry: {
    id: string;
    name: string;
    source?: string;
    subtitle?: string;
  }) => ({
    id: entry.id,
    name: entry.name,
    source: entry.source ?? 'Homebrew',
    srd: false,
    subtitle: entry.subtitle ?? '',
  }),
}));
vi.mock('@/i18n/useT', () => ({
  translate: (_locale: string, key: string) => key,
}));

import {
  buildHomebrewResults,
  buildPool,
  loadSearchIndex,
  scoreResult,
  searchResults,
  type SearchIndex,
  type SearchResult,
} from './searchIndex';

describe('search index construction', () => {
  it('loads and caches a localized index', async () => {
    const first = loadSearchIndex('en');
    const second = loadSearchIndex('en');
    expect(second).toBe(first);
    const index = await first;
    expect(index.categories[0]).toMatchObject({
      id: 'spells',
      label: 'compendium.categories.spells',
    });
    expect(index.wiki.length).toBeGreaterThan(0);
    expect(loadLocalizedItems).toHaveBeenCalledTimes(1);
  });

  it('builds compendium and wiki results for known and unknown categories', () => {
    const index: SearchIndex = {
      categories: [
        {
          id: 'spells',
          label: 'Spells',
          items: [
            {
              id: 'fireball',
              name: 'Fireball',
              englishName: 'Kula Ognia',
              source: 'XPHB',
              srd: true,
            },
          ],
        },
        {
          id: 'missing',
          label: 'Missing',
          items: [{ id: 'entry', name: 'Entry', source: 'XPHB', srd: true }],
        },
      ],
      wiki: [
        {
          kind: 'wiki',
          id: 'page',
          name: 'Page',
          subtitle: '',
          categoryLabel: 'Wiki',
          to: '/wiki/page',
        },
      ],
    };
    const pool = buildPool(index, 'all', 'en');
    expect(pool).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Fireball',
          englishName: 'Kula Ognia',
          subtitle: 'Subtitle Fireball',
        }),
        expect.objectContaining({ name: 'Entry', subtitle: '' }),
        expect.objectContaining({ kind: 'wiki' }),
      ]),
    );
  });

  it('builds homebrew results and excludes subclasses', () => {
    const entries = [
      {
        kind: 'manual' as const,
        id: 'known',
        category: 'spells' as const,
        name: 'Known',
        subtitle: 'Own subtitle',
        body: '',
        createdAt: 1,
      },
      {
        kind: 'manual' as const,
        id: 'derived',
        category: 'spells' as const,
        name: 'Derived',
        subtitle: '',
        body: '',
        createdAt: 2,
      },
      {
        kind: 'manual' as const,
        id: 'unknown',
        category: 'skills' as const,
        name: 'Unknown',
        subtitle: '',
        body: '',
        createdAt: 3,
      },
      {
        kind: 'subclass' as const,
        id: 'sub',
        className: 'Wizard',
        subclass: { name: 'Subclass', source: 'HB', features: [] },
        createdAt: 4,
      },
    ];
    const results = buildHomebrewResults(entries, 'en');
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      subtitle: 'Own subtitle',
      categoryLabel: 'compendium.categories.spells',
    });
    expect(results[1]).toMatchObject({
      subtitle: 'Subtitle Derived',
      categoryLabel: 'compendium.categories.spells',
    });
    expect(results[2]).toMatchObject({
      subtitle: '',
      categoryLabel: 'nav.homebrew',
    });
  });
});

describe('additional search ordering', () => {
  const entry = (name: string, englishName?: string): SearchResult => ({
    kind: 'compendium',
    id: name,
    name,
    ...(englishName ? { englishName } : {}),
    subtitle: '',
    categoryLabel: '',
    to: '/',
  });

  it('scores every English-name match position', () => {
    expect(scoreResult(entry('Polish', 'Fireball'), 'fireball')).toBe(100);
    expect(scoreResult(entry('Polish', 'Fire Bolt'), 'fire')).toBe(80);
    expect(scoreResult(entry('Polish', 'Greater Fire'), 'fire')).toBe(60);
    expect(scoreResult(entry('Polish', 'Wildfire'), 'fire')).toBe(40);
  });

  it('sorts equal scores by length and then alphabetically', () => {
    expect(
      searchResults(
        [entry('Beta Ray'), entry('Alpha Ray'), entry('Long Alpha Ray')],
        'ray',
      ).map((item) => item.name),
    ).toEqual(['Beta Ray', 'Alpha Ray', 'Long Alpha Ray']);
    expect(
      searchResults([entry('Zeta'), entry('Beta')], 'eta').map((item) => item.name),
    ).toEqual(['Beta', 'Zeta']);
  });
});
