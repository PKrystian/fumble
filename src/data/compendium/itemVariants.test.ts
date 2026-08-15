import { describe, expect, it } from 'vitest';
import type { Entry } from './entry';
import {
  interpolateVariantEntries,
  resolveVariantBaseItems,
  variantBaseItems,
  variantInheritedString,
  variantInheritedStrings,
  variantInherits,
} from './itemVariants';
import type { ItemVariantCandidate } from './itemVariants';
import type { JsonObject } from './types';

const candidates: ItemVariantCandidate[] = [
  {
    name: 'Light Armor',
    source: 'XPHB',
    type: 'LA|XPHB',
    armor: true,
    property: ['A|XPHB'],
    level: 1,
  },
  {
    name: 'Excluded Armor',
    source: 'XPHB',
    type: 'LA|XPHB',
    armor: true,
    property: [{ uid: '2H|XPHB' }],
  },
  {
    name: 'Longsword',
    source: 'XPHB',
    type: 'M|XPHB',
    weapon: true,
    sword: true,
    dmgType: 'S',
    property: [{ uid: 'V|XPHB' }],
  },
  {
    name: 'Old Armor',
    source: 'PHB',
    type: 'LA',
    armor: true,
  },
  {
    name: 'Duplicate',
    source: 'XPHB',
    type: 'A|XPHB',
  },
  {
    name: 'Duplicate',
    source: 'PHB',
    type: 'A|XPHB',
  },
  {
    name: 'Duplicate',
    source: 'XPHB',
    type: 'A|XPHB',
  },
  {
    name: 'Empty Flag',
    source: 'XPHB',
    type: 'A|XPHB',
    optional: null,
  },
];

describe('item variant helpers', () => {
  it('resolves named, typed, flagged and excluded base items', () => {
    expect(
      resolveVariantBaseItems(
        [
          { type: 'LA|XPHB', armor: true },
          { sword: true, dmgType: 'S' },
        ],
        [{ property: ['2H|XPHB'] }],
        candidates,
      ),
    ).toEqual([
      { name: 'Light Armor', source: 'XPHB' },
      { name: 'Longsword', source: 'XPHB' },
    ]);
  });

  it('supports string requirements, names, source checks, nulls and duplicate candidates', () => {
    expect(resolveVariantBaseItems('A|XPHB', undefined, candidates)).toEqual([
      { name: 'Duplicate', source: 'PHB' },
      { name: 'Duplicate', source: 'XPHB' },
      { name: 'Empty Flag', source: 'XPHB' },
    ]);
    expect(resolveVariantBaseItems(['A|XPHB', 42], undefined, candidates)).toEqual([
      { name: 'Duplicate', source: 'PHB' },
      { name: 'Duplicate', source: 'XPHB' },
      { name: 'Empty Flag', source: 'XPHB' },
    ]);
    expect(
      resolveVariantBaseItems(
        [{ name: 'Old Armor', source: 'PHB' }],
        undefined,
        candidates,
      ),
    ).toEqual([{ name: 'Old Armor', source: 'PHB' }]);
    expect(resolveVariantBaseItems([{ optional: null }], undefined, candidates)).toEqual([
      { name: 'Empty Flag', source: 'XPHB' },
    ]);
  });

  it('returns no base items for unsupported or empty requirements', () => {
    expect(resolveVariantBaseItems(undefined, undefined, candidates)).toEqual([]);
    expect(resolveVariantBaseItems(42, { armor: true }, candidates)).toEqual([]);
    expect(
      resolveVariantBaseItems([{ missing: 'value' }], undefined, candidates),
    ).toEqual([]);
  });

  it('interpolates variant variables through nested entry data', () => {
    const entries: Entry[] = [
      'You gain a {=bonusAc} bonus.',
      {
        type: 'entries',
        entries: [
          '{=bonusWeapon} damage.',
          { type: 'item', entry: '{=missing} fallback', count: 2 },
        ],
      },
    ];
    expect(
      interpolateVariantEntries(entries, { bonusAc: '+1', bonusWeapon: '+2' }),
    ).toEqual([
      'You gain a +1 bonus.',
      {
        type: 'entries',
        entries: ['+2 damage.', { type: 'item', entry: ' fallback', count: 2 }],
      },
    ]);
    expect(interpolateVariantEntries(undefined, {})).toEqual([]);
  });

  it('reads inherited values and validates base item references', () => {
    const variant = {
      inherits: {
        namePrefix: '+1 ',
        classFeatures: ['Replicate Magic Item', 2],
        lootTables: ['Armaments - Rare'],
      },
      baseItems: [
        { name: 'Breastplate', source: 'XPHB' },
        { name: 'Invalid' },
        'Invalid',
      ],
    } as unknown as JsonObject;
    expect(variantInherits(variant)).toMatchObject({ namePrefix: '+1 ' });
    expect(variantInherits({ direct: 'value' })).toEqual({ direct: 'value' });
    expect(variantInherits(undefined)).toEqual({});
    expect(variantInheritedString(variant, 'namePrefix')).toBe('+1 ');
    expect(variantInheritedString(variant, 'nameSuffix')).toBeUndefined();
    expect(variantInheritedStrings(variant, 'classFeatures')).toEqual([
      'Replicate Magic Item',
    ]);
    expect(variantInheritedStrings(variant, 'missing')).toEqual([]);
    expect(variantBaseItems(variant)).toEqual([{ name: 'Breastplate', source: 'XPHB' }]);
    expect(variantBaseItems({ baseItems: 'invalid' })).toEqual([]);
  });
});
