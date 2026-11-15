import { describe, expect, it } from 'vitest';
import type { Entry } from '@/data/compendium/entry';
import { chapterForAnchor, resolveReaderTarget } from './readerNavigation';

const chapters: Entry[] = [
  'Preface',
  { type: 'section', name: 'Welcome', page: 4, entries: [] },
  {
    type: 'section',
    name: 'Rules',
    page: 10,
    entries: [{ type: 'entries', name: 'Combat', id: 'abc', entries: ['Text'] }],
  },
];

function content(markup: string) {
  const element = document.createElement('div');
  element.innerHTML = markup;
  return element;
}

describe('reader navigation', () => {
  it('finds page ranges, legacy names and stable IDs without a chapter path', () => {
    expect(chapterForAnchor(chapters, { name: null, page: 11 })).toBe(2);
    expect(chapterForAnchor(chapters, { name: 'combat', page: null })).toBe(2);
    expect(chapterForAnchor(chapters, { name: null, page: null, section: 'abc' })).toBe(
      2,
    );
    expect(chapterForAnchor(chapters, { name: 'missing', page: null })).toBe(0);
  });

  it('resolves an original heading in translated text and a standalone reference', () => {
    const root = content(
      '<div data-entry-id="abc"><h3>Walka</h3></div><ul><li data-entry-reference="fireball">Kula Ognia</li></ul>',
    );
    const heading = root.querySelector('h3');
    for (const anchor of [
      { name: null, page: null, section: 'abc' },
      { name: 'Combat', page: null },
      { name: 'Walka', page: null },
    ]) {
      expect(resolveReaderTarget(root, chapters[2], anchor)).toEqual({
        target: heading,
        section: 'abc',
      });
    }
    for (const name of ['Fireball', 'Kula Ognia']) {
      expect(resolveReaderTarget(root, chapters[2], { name, page: 14 })).toEqual({
        target: root.querySelector('li'),
        notice: 'reference',
      });
    }
  });

  it('explains approximate page and missing-section jumps', () => {
    const root = content(
      '<div data-page="10"><h2>Rules</h2></div><p data-page="14">Details</p>',
    );
    const details = root.querySelector('p');
    expect(
      resolveReaderTarget(root, chapters[2], { name: null, page: 14 }),
    ).toMatchObject({ target: details });
    expect(
      resolveReaderTarget(root, chapters[2], { name: 'Unknown', page: 14 }),
    ).toMatchObject({ target: details, notice: 'page' });
    expect(
      resolveReaderTarget(root, chapters[2], { name: null, page: 15 }),
    ).toMatchObject({ target: details, notice: 'page' });
    expect(resolveReaderTarget(root, chapters[2], { name: null, page: 2 })).toMatchObject(
      { target: root.querySelector('h2'), notice: 'chapter' },
    );
    const noHeading = content('<p>Text</p>');
    expect(
      resolveReaderTarget(noHeading, undefined, {
        name: null,
        page: null,
        section: 'abc',
      }),
    ).toEqual({ target: noHeading, notice: 'chapter' });
  });
});
