import { describe, expect, it } from 'vitest';
import type { CompendiumCategoryId } from '@/data/compendium/types';
import {
  canRenderHomebrew,
  isHomebrewDescription,
  isHomebrewFeature,
  isRenderableSubclass,
} from './validateImported';

describe('Homebrew category validation', () => {
  const name = { name: 'Entry' };
  const feature = { level: 3, name: 'Feature', entries: ['Body'] };
  const subclass = { id: 'school', name: 'School', source: 'HB', features: [feature] };
  const sections = {
    traits: [],
    spellcasting: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
  };
  const base = {
    ...name,
    englishName: 'Entry',
    image: 'image.png',
    token: 'token.png',
    source: 'HB',
    page: 42,
    entries: ['Body'],
    lore: ['More'],
    gallery: [{ path: 'path.png', title: 'Title', credit: 'Artist' }],
    otherVersions: [{ id: 'new', source: 'HB' }],
    _filterData: { school: 'Evocation' },
  };

  it.each<[CompendiumCategoryId, unknown]>([
    [
      'classes',
      {
        ...base,
        table: { headers: ['Level'], rows: [['1']] },
        features: [feature],
        subclasses: [subclass],
      },
    ],
    [
      'spells',
      {
        ...base,
        level: 1,
        school: 'A',
        classes: ['Wizard'],
        ritual: true,
        concentration: false,
      },
    ],
    [
      'bestiary',
      {
        ...base,
        ...sections,
        actions: [{ name: 'Attack', entries: ['Hit'] }],
        str: 14,
        cr: '1',
      },
    ],
    ['objects', { ...base, actions: [{ name: 'Attack', entries: [] }] }],
    ['vehicles', { ...base, weapons: [] }],
    [
      'tables',
      { ...base, colLabels: ['d20'], rows: [['1'], [{ type: 'cell', entry: '20' }]] },
    ],
    ['feats', { ...base, prerequisite: '' }],
    ['psionics', { ...base, collection: 'psionics', data: { description: 'Text' } }],
  ])('accepts a renderable %s', (category, data) => {
    expect(canRenderHomebrew(category, data)).toBe(true);
  });

  it.each<[CompendiumCategoryId, unknown]>([
    ['classes', name],
    ['classes', { ...name, table: { headers: ['Level'], rows: 'bad' } }],
    [
      'classes',
      {
        ...name,
        table: { headers: [], rows: [] },
        features: [{ ...feature, entries: [null] }],
        subclasses: [],
      },
    ],
    [
      'classes',
      { ...name, table: { headers: [], rows: [] }, features: [], subclasses: 'bad' },
    ],
    [
      'classes',
      { ...name, table: { headers: [], rows: [] }, features: [], subclasses: [null] },
    ],
    ['bestiary', { ...base, ...sections, cr: '1' }],
    ['bestiary', { ...base, ...sections, str: 14, cr: 1 }],
    [
      'bestiary',
      { ...base, ...sections, str: 14, cr: '1', traits: [{ name: 2, entries: [] }] },
    ],
    ['objects', { ...name, actions: {} }],
    ['vehicles', { ...name, weapons: [null] }],
    ['tables', { ...name, colLabels: 1, rows: [] }],
    ['tables', { ...name, colLabels: [], rows: null }],
    ['tables', { ...name, colLabels: [], rows: [[null]] }],
    ['spells', { ...name, subclasses: [1] }],
    ['spells', { ...name, concentration: 'yes' }],
    ['spells', { ...name, level: 'one' }],
    ['items', { ...name, source: [] }],
    ['items', { ...name, rarity: [] }],
    ['items', { ...name, image: {} }],
    ['items', { ...name, propertyRefs: [false] }],
    ['items', { ...name, entries: [null] }],
    ['items', { ...name, lore: {} }],
    ['items', { ...name, gallery: {} }],
    ['items', { ...name, gallery: [{ path: 'art.png', credit: 12 }] }],
    ['items', { ...name, gallery: [{ path: 2 }] }],
    ['items', { ...name, gallery: [{ path: 'art.png', title: {} }] }],
    ['items', { ...name, _filterData: [] }],
    ['items', { ...name, otherVersions: {} }],
    ['items', { ...name, otherVersions: [{ id: 'one', source: false }] }],
    ['items', { ...name, otherVersions: [{ source: 'HB' }] }],
    ['items', { ...name, otherVersions: [null] }],
    ['items', { name: ' ' }],
    ['items', null],
    ['life', { ...name, collection: 'life', data: [] }],
    ['life', { ...name, data: {} }],
  ])('rejects data that cannot be rendered as %s', (category, data) => {
    expect(canRenderHomebrew(category, data)).toBe(false);
  });

  it('checks nested entries, images, tables and overly deep data', () => {
    expect(
      isHomebrewDescription({
        type: 'table',
        caption: 'Table',
        colLabels: ['d20'],
        rows: [['1'], { type: 'row', row: ['2'] }],
        entries: [{ type: 'list', items: [{ type: 'item', entry: 'Body' }] }],
        images: [
          { type: 'image', href: { path: 'image.png' } },
          { type: 'image', href: { url: 'https://example.invalid' } },
        ],
      }),
    ).toBe(true);
    for (const child of [
      null,
      { type: 3 },
      { type: 'section', name: [] },
      { type: 'section', items: 'bad' },
      { type: 'item', entry: null },
      { type: 'table', rows: {} },
      { type: 'table', rows: [[null]] },
      { type: 'table', colLabels: false },
      { type: 'image', href: [] },
      { type: 'image', href: { path: false } },
      { type: 'image', href: { url: false } },
    ])
      expect(isHomebrewDescription(child)).toBe(false);
    const deep = Array.from({ length: 70 }).reduce<unknown>(
      (entry) => ({ type: 'section', entry }),
      'Body',
    );
    expect(isHomebrewDescription(deep)).toBe(false);
    expect(canRenderHomebrew('items', { ...name, unknown: deep })).toBe(false);
    expect(isHomebrewDescription({ type: 'image', href: 'relative' })).toBe(true);
  });

  it('validates subclass metadata without requiring optional fields', () => {
    expect(isRenderableSubclass(subclass)).toBe(true);
    expect(
      isRenderableSubclass({ ...subclass, image: 'cover.png', lore: [], gallery: [] }),
    ).toBe(true);
    for (const data of [
      null,
      { ...subclass, name: '' },
      { ...subclass, source: [] },
      { ...subclass, features: null },
      { ...subclass, image: 1 },
      { ...subclass, lore: [{}] },
      { ...subclass, gallery: [false] },
    ]) {
      expect(isRenderableSubclass(data)).toBe(false);
    }
    expect(isHomebrewFeature({ ...feature, level: NaN })).toBe(false);
    expect(isHomebrewFeature(null)).toBe(false);
  });
});
