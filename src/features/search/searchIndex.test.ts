import { describe, expect, it } from 'vitest';
import { scoreResult, searchResults, type SearchResult } from './searchIndex';

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
    ];

    expect(searchResults(pool, 'fire', 2).map((entry) => entry.name)).toEqual([
      'Fire Bolt',
      'Kula Ognia',
    ]);
    expect(searchResults(pool, '   ')).toEqual([]);
  });
});
