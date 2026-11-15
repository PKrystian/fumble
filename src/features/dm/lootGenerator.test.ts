import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemEntry } from '@/data/compendium/types';
import { createCharacter } from '@/features/character/model';
import {
  canonicalItemField,
  canonicalLootItem,
  generateLoot,
  knownLootValue,
  lootCandidates,
  lootCatalog,
  rollLootItems,
  snapshotItem,
  splitLootValue,
  variantBases,
} from './lootGenerator';
import { isUsableBy } from './loot';
import type { LootContext } from './lootData';
import itemsData from '@/data/generated/items.json';
import polishItems from '@/data/generated/pl/items.json';

const rolls = vi.hoisted(() => ({
  values: [] as Array<number | null>,
  expressions: [] as string[],
}));
vi.mock('@/features/dice/engine', () => ({
  rollExpression: (expression: string) => {
    rolls.expressions.push(expression);
    const total = rolls.values.shift();
    return total === null ? null : { total: total ?? 2 };
  },
}));

function item(id: string, rarity = 'Common', extra: Partial<ItemEntry> = {}): ItemEntry {
  return {
    id,
    name: id,
    source: 'XDMG',
    srd: true,
    type: 'Wondrous Item',
    rarity,
    attunement: '',
    weight: '',
    value: '',
    damage: '',
    ac: '',
    properties: '',
    range: '',
    entries: [],
    ...extra,
  };
}
const context: LootContext = {
  mode: 'party',
  reward: 'major',
  tierId: 1,
  partySize: 4,
  partyLevel: 1,
  party: [],
  edition: 'all',
  includeUnknown: false,
};
beforeEach(() => {
  vi.restoreAllMocks();
  rolls.values = [];
  rolls.expressions = [];
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

describe('loot catalog eligibility', () => {
  it('skips incomplete records without changing homebrew or hiding legacy printings from edition resolution', () => {
    const manual = {
      id: 'hb',
      name: 'Manual item',
      source: 'Homebrew',
      srd: false,
    } as ItemEntry;
    const hidden = item('old', 'Common', { hidden: true, source: 'DMG' });
    const current = item('new', 'Common', {
      otherVersions: [{ id: 'old', source: 'DMG' }],
    });
    const entries = [manual, hidden, current, { ...manual, id: 'hidden', hidden: true }];
    const original = structuredClone(entries);
    const catalog = lootCatalog(entries);
    expect(catalog.skipped).toEqual([manual]);
    expect(
      lootCandidates(catalog.valid, context).candidates.map((row) => row.id),
    ).toEqual(['new']);
    expect(
      lootCandidates(catalog.valid, { ...context, edition: '2014' }).candidates.map(
        (row) => row.id,
      ),
    ).toEqual(['old']);
    expect(
      lootCandidates(catalog.valid, { ...context, edition: '2024' }).candidates.map(
        (row) => row.id,
      ),
    ).toEqual(['new']);
    expect(entries).toEqual(original);
    for (const extra of [
      { id: '' },
      { name: ' ' },
      { source: '' },
      { type: null },
      { type: '' },
      { rarity: null },
    ])
      expect(
        canonicalLootItem({ ...current, ...extra } as unknown as ItemEntry),
      ).toBeNull();
  });

  it('uses canonical fields, repairs localized-only metadata and excludes prohibited item types', () => {
    const localized = item('pl', 'Pospolita', {
      name: 'Przedmiot',
      englishName: 'Item',
      type: 'Cudowny przedmiot',
      _filterData: { rarity: 'Common', type: 'Wondrous Item', name: 'Item' },
    });
    expect(canonicalLootItem(localized)).toMatchObject({
      name: 'Item',
      rarity: 'Common',
      type: 'Wondrous Item',
    });
    expect(canonicalLootItem({ ...localized, _filterData: {} })).toMatchObject({
      name: 'Item',
      rarity: 'Common',
      type: 'Wondrous Item',
    });
    expect(canonicalItemField(localized, 'absent')).toBe('');
    expect(canonicalItemField(item('empty'), 'name')).toBe('empty');
    const catalog = lootCatalog([
      localized,
      item('wagon', 'Common', { type: 'Vehicle (Land)' }),
      item('coin', 'Common', { type: 'Treasure (Coinage)' }),
      item('sword', 'Common', { weaponCategory: 'martial' }),
    ]).valid;
    expect(lootCandidates(catalog, context).candidates.map((row) => row.id)).toEqual([
      'pl',
      'sword',
    ]);
    expect(snapshotItem(catalog[3]!)).toMatchObject({ weaponCategory: 'martial' });
    const withoutOptional = {
      id: 'minimal',
      name: 'Minimal',
      source: 'Homebrew',
      type: 'Mikstura',
      rarity: 'Pospolita',
      srd: false,
    } as ItemEntry;
    expect(canonicalLootItem(withoutOptional)).toMatchObject({
      type: 'Potion',
      rarity: 'Common',
      attunement: '',
      entries: [],
    });
  });

  it('has exactly the same common eligibility for the complete English and Polish catalogs', () => {
    const english = itemsData.items as ItemEntry[];
    const overlays = polishItems as Record<string, Record<string, unknown>>;
    const polish = english.map(
      (entry) =>
        ({
          ...entry,
          ...overlays[entry.id],
          _filterData: {
            name: entry.name,
            type: entry.type,
            rarity: entry.rarity,
            attunement: entry.attunement,
            ...(entry.weaponCategory ? { weaponCategory: entry.weaponCategory } : {}),
          },
        }) as ItemEntry,
    );
    for (const tierId of [1, 2, 3, 4])
      for (const reward of ['minor', 'major'] as const) {
        const settings = { ...context, tierId, reward };
        expect(
          lootCandidates(lootCatalog(polish).valid, settings).candidates.map(
            (row) => row.id,
          ),
        ).toEqual(
          lootCandidates(lootCatalog(english).valid, settings).candidates.map(
            (row) => row.id,
          ),
        );
      }
  });

  it('caps wildcard rarity and only permits unranked items after opting in', () => {
    const catalog = [
      item('common'),
      item('rare', 'Rare'),
      item('artifact', 'Artifact'),
      item('unknown', 'Unknown (magic)'),
      item('varies', 'Varies'),
      item('mundane', ''),
    ];
    const wildcard: LootContext = { ...context, mode: 'wildcard', reward: 'wildcard' };
    expect(lootCandidates(catalog, wildcard).candidates.map((row) => row.id)).toEqual([
      'common',
      'mundane',
    ]);
    expect(
      lootCandidates(catalog, { ...wildcard, includeUnknown: true }).candidates.map(
        (row) => row.id,
      ),
    ).toEqual(['common', 'unknown', 'varies', 'mundane']);
    expect(
      lootCandidates(catalog, { ...context, reward: 'minor' }).candidates.map(
        (row) => row.id,
      ),
    ).toEqual(['common']);
  });

  it('checks explicit class requirements conservatively and resolves eligible concrete variant bases', () => {
    const fighter = {
      ...createCharacter('Fighter'),
      className: 'Wojownik',
      armorProficiencies: 'Light armor',
      weaponProficiencies: 'Simple weapons',
    };
    const staff = item('staff', 'Rare', {
      type: 'Melee Weapon',
      weaponCategory: 'simple',
      attunement: 'Requires attunement by a bard, cleric, or druid',
    });
    expect(isUsableBy(staff, fighter)).toBe(false);
    expect(isUsableBy(staff, { ...fighter, className: 'Kapłan' })).toBe(true);
    expect(isUsableBy(staff, { ...fighter, className: '' })).toBe(true);
    expect(
      isUsableBy(
        { ...staff, attunement: 'Requires attunement by an artificer' },
        { ...fighter, className: 'Artificer' },
      ),
    ).toBe(true);
    expect(
      isUsableBy(
        { ...staff, attunement: 'Requires attunement by a creature of good alignment' },
        fighter,
      ),
    ).toBe(true);
    const sword = item('sword', '', { type: 'Melee Weapon', weaponCategory: 'martial' });
    const club = item('club', '', { type: 'Melee Weapon', weaponCategory: 'simple' });
    const variant = item('variant', 'Common', {
      type: 'Generic Variant',
      variant: {
        baseItems: [
          { name: 'sword', source: 'XDMG' },
          { name: 'club', source: 'XDMG' },
        ],
      },
    });
    const partyContext = { ...context, party: [fighter] };
    expect(
      variantBases(variant, [sword, club], partyContext).map((base) => base.id),
    ).toEqual(['club']);
    expect(
      lootCandidates([variant, sword, club], partyContext).candidates.map(
        (row) => row.id,
      ),
    ).toEqual(['variant']);
    expect(lootCandidates([variant, sword], partyContext).candidates).toEqual([]);
    expect(variantBases(item('plain'), [club], partyContext)).toEqual([]);
    const armor = item('armor', '', { type: 'Light Armor' });
    const armorVariant = item('magic-armor', 'Common', {
      variant: { baseItems: [{ name: 'armor', source: 'XDMG' }] },
    });
    expect(variantBases(armorVariant, [armor], partyContext)).toEqual([armor]);
  });
});

describe('loot generation and division', () => {
  it('generates major, minor, tier and wildcard rewards with distinct formulas and unique items', () => {
    const catalog = [item('one'), item('two', 'Uncommon'), item('three', 'Rare')];
    rolls.values = [10, 4, 2];
    const major = generateLoot(catalog, context);
    expect(major).toMatchObject({
      gold: 100,
      gemCount: 4,
      gemValue: 10,
      splitCount: '4',
      splitEnabled: false,
    });
    expect(new Set(major.items.map((row) => row.item.id)).size).toBe(2);
    expect(knownLootValue(major)).toBe(140);
    rolls.values = [3, 1];
    const minor = generateLoot(catalog, { ...context, reward: 'minor' });
    expect(minor).toMatchObject({ gold: 15, gemCount: 0, gemValue: 0, items: [] });
    rolls.values = [5, 2];
    const wildcard = generateLoot(catalog, {
      ...context,
      mode: 'wildcard',
      reward: 'wildcard',
      partySize: 0,
    });
    expect(wildcard).toMatchObject({ gold: 25, gemCount: 0, splitCount: '1' });
    expect(rolls.expressions.slice(-2)).toEqual(['3d6', '1d2']);
    const tier = generateLoot(catalog, {
      ...context,
      mode: 'tier',
      reward: 'hoard',
      tierId: 2,
    });
    expect(tier).toMatchObject({ gold: 200, gemValue: 50 });
    expect(splitLootValue({ ...major, gold: 1, gemCount: 0 }, 3)).toEqual({
      share: 0.33,
      remainder: 0.01,
    });
    expect(splitLootValue({ ...major, gold: 0, gemCount: 0 }, 8)).toEqual({
      share: 0,
      remainder: 0,
    });
  });

  it('preserves the original reward during rerolls and reports empty pools and dice failures', () => {
    const original = generateLoot([item('one')], context);
    const saved = structuredClone(original);
    expect(rollLootItems([item('one')], original.context)).toHaveLength(1);
    expect(original).toEqual(saved);
    expect(() => rollLootItems([], context)).toThrow('loot-empty-pool');
    rolls.values = [null];
    expect(() => generateLoot([item('one')], context)).toThrow('loot-roll-failed');
    rolls.values = [null];
    expect(() => rollLootItems([item('one')], context)).toThrow('loot-roll-failed');
  });
});
