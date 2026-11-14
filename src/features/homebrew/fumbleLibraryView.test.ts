import { describe, expect, it } from 'vitest';
import type { FumbleHomebrewItem } from './fumbleHomebrew';
import { libraryExcerpt, libraryPage, librarySearchRank } from './fumbleLibraryView';

const item: FumbleHomebrewItem = {
  id: 'witch',
  name: 'Wiedźma',
  englishName: 'Witch',
  category: 'classes',
  subtitle: 'Kość Wytrzymałości d8',
  source: 'Fumble',
  srd: false,
  campaigns: [],
};

describe('homebrew library results', () => {
  it('prioritizes normalized exact, prefix and partial names over metadata', () => {
    expect(librarySearchRank(item, ' WIEDZMA ', '')).toBe(0);
    expect(librarySearchRank(item, 'witch', '')).toBe(0);
    expect(librarySearchRank(item, 'wied', '')).toBe(1);
    expect(librarySearchRank(item, 'itch', '')).toBe(2);
    expect(librarySearchRank(item, 'kosc', item.subtitle)).toBe(3);
    expect(librarySearchRank(item, 'missing', item.subtitle)).toBe(-1);
    expect(librarySearchRank(item, '  ', '')).toBe(0);
    const monolingual = { ...item };
    delete monolingual.englishName;
    expect(librarySearchRank(monolingual, 'witch', '')).toBe(-1);
  });

  it('extracts prose from nested entries without leaking markup or table values', () => {
    expect(libraryExcerpt(item, 'en')).toBe('');
    expect(
      libraryExcerpt(
        {
          ...item,
          intro: [' ', { type: 'table', rows: [['not prose']] }],
          entries: [
            {
              type: 'entries',
              entries: [''],
              items: [
                {
                  type: 'item',
                  entry: 'Use {@b {@spell Fireball|XPHB|Kula Ognia}} for {@damage 2d8}.',
                },
              ],
            },
          ],
        },
        'pl',
      ),
    ).toBe('Use Kula Ognia for 2d8.');
    expect(
      libraryExcerpt({ ...item, lore: [' Lore\n text '], entries: ['Later'] }, 'en'),
    ).toBe('Lore text');
    expect(libraryExcerpt({ ...item, intro: ['Intro'], entries: ['Later'] }, 'en')).toBe(
      'Intro',
    );
    expect(
      libraryExcerpt(
        { ...item, entries: [{ type: 'entries', entries: [] }, 'Text'] },
        'en',
      ),
    ).toBe('Text');
  });

  it('bounds long excerpts at word boundaries, including a single long word', () => {
    const excerpt = libraryExcerpt(
      { ...item, entries: ['A short sentence. '.repeat(30)] },
      'en',
    );
    expect(excerpt).toHaveLength(180);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(libraryExcerpt({ ...item, entries: ['x'.repeat(181)] }, 'en')).toBe(
      `${'x'.repeat(180)}…`,
    );
  });

  it.each([null, '', '0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992'])(
    'uses page one for invalid page %s',
    (value) => {
      expect(libraryPage(value, 364)).toBe(1);
    },
  );

  it('clamps pages to the available results', () => {
    expect(libraryPage('2', 364)).toBe(2);
    expect(libraryPage('999', 364)).toBe(8);
    expect(libraryPage('999', 0)).toBe(1);
  });
});
