import { describe, expect, it, vi } from 'vitest';
import { fumbleHomebrewItems } from '@/features/homebrew/fumbleHomebrew';
import {
  buildPool,
  loadSearchIndex,
  scoreResult,
  searchResults,
  type SearchResult,
} from './searchIndex';

const result = (name: string, englishName?: string): SearchResult => ({
  kind: 'compendium',
  id: name.toLowerCase().replaceAll(' ', '-'),
  name,
  ...(englishName ? { englishName } : {}),
  subtitle: '',
  categoryLabel: 'Spells',
  to: '/compendium/spells/example',
});

describe('search index scoring', () => {
  it('ranks exact, prefix, word and substring matches', () => {
    expect(scoreResult(result('Fireball'), 'fireball')).toBe(100);
    expect(scoreResult(result('Fire Bolt'), 'fire')).toBe(80);
    expect(scoreResult(result('Greater Fire Shield'), 'fire')).toBe(60);
    expect(scoreResult(result('Wildfire Spirit'), 'fire')).toBe(40);
    expect(scoreResult(result('Magic Missile'), 'fire')).toBe(0);
  });

  it('matches localized entries by their English names and respects the limit', () => {
    const pool = [
      result('Kula Ognia', 'Fireball'),
      result('Fire Bolt'),
      result('Wildfire Spirit'),
      result('Magic Missile'),
    ];

    expect(searchResults(pool, 'fire', 2).map((entry) => entry.name)).toEqual([
      'Fire Bolt',
      'Kula Ognia',
    ]);
    expect(searchResults(pool, '   ')).toEqual([]);
  });

  it('matches Polish names without diacritics', () => {
    expect(searchResults([result('Człowiek')], 'Czlow')).toEqual([
      expect.objectContaining({ name: 'Człowiek' }),
    ]);
  });

  it('keeps Fumble entries out of the pool until enabled', () => {
    const fumble = fumbleHomebrewItems('en').find((item) => item.id === 'flanking')!;
    const index = {
      categories: [{ id: 'rules', label: 'Rules', items: [fumble] }],
      wiki: [],
    };

    expect(buildPool(index, 'all', 'en')).toEqual([]);
    expect(buildPool(index, 'all', 'en', true)).toEqual([
      expect.objectContaining({ name: 'Flanking', to: '/compendium/rules/flanking' }),
    ]);
  });

  it('compacts prebuilt entries, indexes wiki variants and reuses a cached promise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          categories: [
            {
              id: 'spells',
              items: [
                {
                  id: 'indexed-spell',
                  name: 'Indexed Spell',
                  englishName: 'Indexed Spell English',
                  source: 'XPHB',
                  otherVersions: [
                    { id: 'legacy', source: 'PHB' },
                    { id: 'invalid' },
                    null,
                  ],
                  entries: ['large data omitted'],
                },
                {
                  id: 'sparse-indexed-item',
                  name: 'Sparse Indexed Item',
                  source: 'XPHB',
                  otherVersions: { invalid: true },
                },
              ],
            },
          ],
          wiki: [
            { campaignId: 'campaign', slug: 'with-campaign', title: 'With Campaign' },
            { slug: 'without-campaign', title: 'Without Campaign', category: 'Lore' },
          ],
        }),
      }),
    );

    const first = loadSearchIndex('pl');
    expect(loadSearchIndex('pl')).toBe(first);
    const index = await first;

    expect(index.categories[0]!.items[0]).toMatchObject({
      id: 'indexed-spell',
      englishName: 'Indexed Spell English',
      otherVersions: [{ id: 'legacy', source: 'PHB' }],
    });
    expect(index.wiki).toEqual([
      expect.objectContaining({
        id: 'campaign/with-campaign',
        to: '/wiki/campaign/with-campaign',
      }),
      expect.objectContaining({
        id: 'without-campaign',
        subtitle: 'Lore',
        to: '/wiki/without-campaign',
      }),
    ]);
  });

  it('builds routes for subclasses and unknown categories', () => {
    const pool = buildPool(
      {
        categories: [
          {
            id: 'classes',
            label: 'Classes',
            items: [
              {
                id: 'zerth-warrior',
                name: 'Zerth Warrior',
                source: 'Fumble',
                srd: false,
                isSubclass: true,
                className: 'Monk',
              } as never,
            ],
          },
          {
            id: 'unknown',
            label: 'Unknown',
            items: [{ id: 'custom', name: 'Custom', source: 'HB', srd: false }],
          },
        ],
        wiki: [],
      },
      'all',
      'en',
    );

    expect(pool).toEqual([
      expect.objectContaining({
        name: 'Zerth Warrior',
        to: '/compendium/classes/monk/zerth-warrior',
      }),
      expect.objectContaining({ name: 'Custom', to: '/homebrew' }),
    ]);
  });
});
