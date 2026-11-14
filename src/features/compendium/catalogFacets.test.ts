import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { categories } from './categories';
import {
  canonicalCreatureType,
  canonicalSize,
  codeLabel,
  conditionValues,
  damageValues,
  languageValues,
  numericValue,
  sizeValues,
} from './catalogFacets';
import { compareItems, displayValue, facetCounts, filterValuesFor } from './filterSort';
import { localizeItems } from '@/data/compendium/localize';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { CategoryOverlay } from '@/data/compendium/localize';
import { translate } from '@/i18n/translate';
import { fumbleHomebrewItems } from '@/features/homebrew/fumbleHomebrew';

describe('catalog facets', () => {
  it('keeps built-in Fumble filters stable and reads array metadata', () => {
    const en = fumbleHomebrewItems('en'),
      pl = fumbleHomebrewItems('pl');
    for (const category of categories)
      for (const filter of category.filters ?? []) {
        const entries = en.filter(
          (item) => item.category === category.id && !item.isSubclass,
        );
        expect(
          entries.map((item) =>
            filterValuesFor(
              filter,
              pl.find((candidate) => candidate.id === item.id)!,
            ),
          ),
          `${category.id}/${filter.id}`,
        ).toEqual(entries.map((item) => filterValuesFor(filter, item)));
      }
    const skill = categories
      .find((category) => category.id === 'backgrounds')!
      .filters!.find((filter) => filter.id === 'skills')!;
    expect(skill.valuesFor({ skills: ['Athletics', 2] } as never)).toEqual(['Athletics']);
    const rarity = categories
      .find((category) => category.id === 'items')!
      .filters!.find((filter) => filter.id === 'rarity')!;
    expect(
      rarity.valuesFor({
        rarity: 'Uncommon (+1), Rare (+2), or Very Rare (+3)',
      } as never),
    ).toEqual(expect.arrayContaining(['Uncommon', 'Rare', 'Very Rare']));
    expect(rarity.valuesFor({ rarity: 'Unknown' } as never)).toEqual(['Unknown']);
    expect(rarity.sortKey?.('Unknown')).toBeGreaterThan(rarity.sortKey!('Artifact'));
  });
  it('extracts canonical mechanics without prose fragments', () => {
    expect(sizeValues('Small or Medium')).toEqual(['Small', 'Medium']);
    expect(sizeValues('Mały lub Średni')).toEqual(['Small', 'Medium']);
    expect(canonicalSize('Unknown')).toBe('Unknown');
    expect(canonicalCreatureType('Bestia')).toBe('Beast');
    expect(damageValues('fire; bludgeoning from nonmagical attacks')).toEqual([
      'bludgeoning',
      'fire',
    ]);
    expect(conditionValues('blinded, poisoned')).toEqual(['blinded', 'poisoned']);
    expect(
      languageValues('Common, Draconic but cannot speak, telepathy 120 ft.'),
    ).toEqual(expect.arrayContaining(['Common', 'Draconic']));
    expect(languageValues('Any three languages')).toContain('Any');
    expect(languageValues('understands but cannot speak')).toEqual([]);
    expect(codeLabel('DG', 'pl')).toBe('Mroczny dar');
    expect(codeLabel('AS, FS:P', 'en')).toBe('Arcane Shot, Fighting Style (Paladin)');
    expect(codeLabel('General', 'pl')).toBe('Ogólny');
    expect(codeLabel('Unknown')).toBe('Unknown');
  });
  it.each([
    ['1,200 gp', 'money', 1200],
    ['2gp', 'money', 2],
    ['16oz', 'weight', 1],
    ['1 bonus', 'time', 0.5],
    ['Instantaneous', 'time', 0],
    ['Until dispelled', 'time', 1e12],
    ['20 sp', 'money', 2],
    ['2 pp', 'money', 20],
    ['4 ep', 'money', 2],
    ['100 cp', 'money', 1],
    ['10', 'money', undefined],
    ['16 oz.', 'weight', 1],
    ['2 lb.', 'weight', 2],
    ['3 kg', 'weight', undefined],
    ['Self', 'distance', 0],
    ['Touch', 'distance', 1],
    ['Unlimited', 'distance', 1e12],
    ['1 mile', 'distance', 5280],
    ['30 feet', 'distance', 30],
    ['Sight', 'distance', undefined],
    ['1 bonus action', 'time', 0.5],
    ['1 reaction', 'time', 0.25],
    ['2 rounds', 'time', 12],
    ['1 minute', 'time', 60],
    ['2 hours', 'time', 7200],
    ['1 day', 'time', 86400],
    ['1 action', 'time', 6],
    ['2 unknown', 'time', undefined],
    ['Special', 'number', undefined],
    ['5', 'number', 5],
  ] as const)('normalizes %s (%s)', (value, quantity, result) =>
    expect(numericValue(value, quantity)).toBe(result),
  );
  it('counts with other facets and keeps missing sort values last in both directions', () => {
    const filters = [
      {
        id: 'size',
        label: 'Size',
        valuesFor: (item: CompendiumEntryBase) =>
          item.id === 'a' ? ['Small'] : ['Large'],
      },
      {
        id: 'source',
        label: 'Source',
        valuesFor: (item: CompendiumEntryBase) => [item.source],
      },
    ];
    const items = [
      { id: 'a', name: 'A', source: 'PHB', srd: true },
      { id: 'b', name: 'B', source: 'XPHB', srd: true },
      { id: 'c', name: 'C', source: 'XPHB', srd: true },
    ];
    const counts = facetCounts(items, filters, { size: ['Small'], source: ['XPHB'] });
    expect(counts.get('size')?.get('Large')).toBe(2);
    expect(counts.get('source')?.get('PHB')).toBe(1);
    const price = categories
      .find((category) => category.id === 'items')!
      .sorts!.find((sort) => sort.id === 'value')!;
    const priced = { ...items[0]!, value: '1 gp' },
      empty = items[1]!;
    for (const dir of ['asc', 'desc'] as const) {
      expect(
        compareItems(priced, empty, 'value', dir, [price], (key) => key, 'en'),
      ).toBeLessThan(0);
      expect(
        compareItems(empty, priced, 'value', dir, [price], (key) => key, 'en'),
      ).toBeGreaterThan(0);
    }
  });
  it('keeps all generated category facets stable across locales with readable labels', () => {
    for (const category of categories) {
      const path = `src/data/generated/${category.id}.json`;
      const source = existsSync(path)
        ? (JSON.parse(readFileSync(path, 'utf8')).items as CompendiumEntryBase[])
        : [];
      const overlayPath = `src/data/generated/pl/${category.id}.json`;
      const overlay = existsSync(overlayPath)
        ? (JSON.parse(readFileSync(overlayPath, 'utf8')) as CategoryOverlay)
        : undefined;
      const en = localizeItems(source, undefined, 'en'),
        pl = localizeItems(source, overlay, 'pl');
      for (const filter of category.filters ?? []) {
        expect(
          pl.map((item) => filterValuesFor(filter, item)),
          `${category.id}/${filter.id}`,
        ).toEqual(en.map((item) => filterValuesFor(filter, item)));
        expect(translate('pl', filter.label)).not.toBe(filter.label);
        const values = new Set(pl.flatMap((item) => filterValuesFor(filter, item)));
        for (const value of values) {
          const label = displayValue(filter, value, (key) => translate('pl', key), 'pl');
          expect(label).not.toMatch(/^(?:compendium|dice)\./);
        }
      }
    }
  });
});
