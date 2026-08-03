import { describe, expect, it } from 'vitest';
import { normalizeSearchText, withEnglishName } from './searchText';

describe('search text helpers', () => {
  it('normalizes Polish diacritics and ł', () => {
    expect(normalizeSearchText('Człowiek')).toBe('czlowiek');
  });

  it('adds the original name to a translated result', () => {
    expect(withEnglishName({ name: 'Broń Ostrzegawcza' }, 'Weapon of Warning')).toEqual({
      name: 'Broń Ostrzegawcza',
      englishName: 'Weapon of Warning',
    });
  });

  it('does not replace an existing original name', () => {
    const withOriginal = { name: 'Translated', englishName: 'Existing' };
    expect(withEnglishName(withOriginal, 'New original')).toBe(withOriginal);
    const sameName = { name: 'Same' };
    expect(withEnglishName(sameName, 'Same')).toBe(sameName);
  });
});
