import { describe, expect, it } from 'vitest';
import {
  armorClassBreakdown,
  createCharacter,
  parseArmorType,
  type Character,
  type InventoryItem,
} from './model';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter('Tester'), ...overrides };
}

function armor(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'i1',
    name: 'Armor',
    notes: '',
    quantity: 1,
    equipped: true,
    ...overrides,
  };
}

const dex16 = { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 } as const;
const dex20 = { str: 10, dex: 20, con: 10, int: 10, wis: 10, cha: 10 } as const;

describe('armour class', () => {
  it('is 10 + Dex with nothing equipped', () => {
    expect(armorClassBreakdown(makeCharacter({ abilities: { ...dex16 } })).total).toBe(
      13,
    );
  });

  it('adds full Dex to light armour', () => {
    const character = makeCharacter({
      abilities: { ...dex16 },
      inventory: [armor({ name: 'Leather', armorType: 'light', baseAc: 11 })],
    });
    expect(armorClassBreakdown(character).total).toBe(14);
  });

  it('caps Dex at +2 for medium armour', () => {
    const character = makeCharacter({
      abilities: { ...dex20 },
      inventory: [armor({ name: 'Half Plate', armorType: 'medium', baseAc: 15 })],
    });
    expect(armorClassBreakdown(character).total).toBe(17);
  });

  it('ignores Dex entirely for heavy armour', () => {
    const low = makeCharacter({
      inventory: [armor({ name: 'Chain Mail', armorType: 'heavy', baseAc: 16 })],
    });
    const high = makeCharacter({
      abilities: { ...dex20 },
      inventory: [armor({ name: 'Chain Mail', armorType: 'heavy', baseAc: 16 })],
    });
    expect(armorClassBreakdown(low).total).toBe(16);
    expect(armorClassBreakdown(high).total).toBe(16);
  });

  it('adds a shield on top of armour', () => {
    const character = makeCharacter({
      abilities: { ...dex16 },
      inventory: [
        armor({ name: 'Leather', armorType: 'light', baseAc: 11 }),
        armor({ id: 'i2', name: 'Shield', armorType: 'shield', baseAc: 2 }),
      ],
    });
    expect(armorClassBreakdown(character).total).toBe(16);
  });

  it('ignores armour that is carried but not equipped', () => {
    const character = makeCharacter({
      abilities: { ...dex16 },
      inventory: [
        armor({ name: 'Chain Mail', armorType: 'heavy', baseAc: 16, equipped: false }),
      ],
    });
    expect(armorClassBreakdown(character).total).toBe(13);
  });

  it('uses an unarmored defense formula when no armour is worn (Monk 10+Dex+Wis)', () => {
    const character = makeCharacter({
      abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 14, cha: 10 },
      unarmoredDefense: {
        base: 10,
        abilities: ['dex', 'wis'],
        allowShield: false,
        source: 'Unarmored Defense',
      },
    });
    expect(armorClassBreakdown(character).total).toBe(15);
  });

  it('lets armour win over unarmored defense once it is worn', () => {
    const character = makeCharacter({
      abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 14, cha: 10 },
      unarmoredDefense: {
        base: 10,
        abilities: ['dex', 'wis'],
        allowShield: false,
        source: 'Unarmored Defense',
      },
      inventory: [armor({ name: 'Chain Mail', armorType: 'heavy', baseAc: 16 })],
    });
    expect(armorClassBreakdown(character).total).toBe(16);
  });

  it('honours allowShield on the unarmored formula', () => {
    const base = {
      abilities: { str: 10, dex: 16, con: 14, int: 10, wis: 10, cha: 10 },
      inventory: [armor({ id: 's', name: 'Shield', armorType: 'shield', baseAc: 2 })],
    };
    const barbarian = makeCharacter({
      ...base,
      unarmoredDefense: {
        base: 10,
        abilities: ['dex', 'con'],
        allowShield: true,
        source: 'Unarmored Defense',
      },
    });
    const monk = makeCharacter({
      ...base,
      unarmoredDefense: {
        base: 10,
        abilities: ['dex', 'con'],
        allowShield: false,
        source: 'Unarmored Defense',
      },
    });
    expect(armorClassBreakdown(barbarian).total).toBe(17);
    expect(armorClassBreakdown(monk).total).toBe(15);
  });

  it('lets a manual override win and reports itself as manual', () => {
    const character = makeCharacter({
      abilities: { ...dex20 },
      acOverride: 21,
      inventory: [armor({ name: 'Chain Mail', armorType: 'heavy', baseAc: 16 })],
    });
    const result = armorClassBreakdown(character);
    expect(result.total).toBe(21);
    expect(result.manual).toBe(true);
  });

  it('maps compendium item types onto armour slots', () => {
    expect(parseArmorType('Heavy Armor')).toBe('heavy');
    expect(parseArmorType('Light Armor')).toBe('light');
    expect(parseArmorType('Medium Armor')).toBe('medium');
    expect(parseArmorType('Shield')).toBe('shield');
    expect(parseArmorType('Melee Weapon')).toBeUndefined();
  });
});
