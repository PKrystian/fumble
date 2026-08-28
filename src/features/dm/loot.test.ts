import { describe, expect, it } from 'vitest';
import { createCharacter, type Character } from '@/features/character/model';
import type { ItemEntry } from '@/data/compendium/types';
import {
  TIERS,
  isExcludedItemType,
  isUsableBy,
  isUsableByParty,
  rarityMatches,
  rarityAtMost,
  tierForLevel,
  usableByNames,
} from './loot';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...createCharacter('Tester'), ...overrides };
}

function makeItem(overrides: Partial<ItemEntry> = {}): ItemEntry {
  return {
    id: 'item',
    name: 'Item',
    source: 'XPHB',
    srd: true,
    type: 'Wondrous Item',
    rarity: 'Uncommon',
    attunement: '',
    weight: '',
    value: '',
    damage: '',
    ac: '',
    properties: '',
    range: '',
    entries: [],
    ...overrides,
  };
}

describe('tierForLevel', () => {
  it('buckets levels into the four treasure tiers', () => {
    expect(tierForLevel(1).id).toBe(1);
    expect(tierForLevel(4).id).toBe(1);
    expect(tierForLevel(5).id).toBe(2);
    expect(tierForLevel(10).id).toBe(2);
    expect(tierForLevel(11).id).toBe(3);
    expect(tierForLevel(16).id).toBe(3);
    expect(tierForLevel(17).id).toBe(4);
    expect(tierForLevel(20).id).toBe(4);
  });

  it('falls back to the top tier above level 20', () => {
    expect(tierForLevel(25).id).toBe(TIERS[TIERS.length - 1]!.id);
  });
});

describe('isUsableBy', () => {
  it('allows armor matching the character armor proficiency', () => {
    const heavyArmor = makeItem({ type: 'Heavy Armor' });
    const proficient = makeCharacter({
      armorProficiencies: 'Light, Medium, Heavy, Shields',
    });
    expect(isUsableBy(heavyArmor, proficient)).toBe(true);
  });

  it('denies armor the character has no proficiency in', () => {
    const heavyArmor = makeItem({ type: 'Heavy Armor' });
    const lightOnly = makeCharacter({ armorProficiencies: 'Light armor' });
    expect(isUsableBy(heavyArmor, lightOnly)).toBe(false);
  });

  it('understands localized armor and weapon values', () => {
    expect(
      isUsableBy(
        makeItem({ type: 'Ciężka Zbroja' }),
        makeCharacter({ armorProficiencies: 'Lekka, Średnia, Ciężka, Tarcze' }),
      ),
    ).toBe(true);
    expect(
      isUsableBy(
        makeItem({ type: 'Broń biała', weaponCategory: 'wojenny' }),
        makeCharacter({ weaponProficiencies: 'proste, wojenne' }),
      ),
    ).toBe(true);
  });

  it('treats a blank armor proficiency as unknown, not disqualifying', () => {
    const heavyArmor = makeItem({ type: 'Heavy Armor' });
    const unset = makeCharacter({ armorProficiencies: '' });
    expect(isUsableBy(heavyArmor, unset)).toBe(true);
  });

  it('allows weapons matching the character weapon category', () => {
    const martialSword = makeItem({ type: 'Melee Weapon', weaponCategory: 'martial' });
    const martialProficient = makeCharacter({ weaponProficiencies: 'Simple, Martial' });
    expect(isUsableBy(martialSword, martialProficient)).toBe(true);
  });

  it('denies weapons outside the character weapon category', () => {
    const martialSword = makeItem({ type: 'Melee Weapon', weaponCategory: 'martial' });
    const simpleOnly = makeCharacter({ weaponProficiencies: 'Simple weapons' });
    expect(isUsableBy(martialSword, simpleOnly)).toBe(false);
  });

  it('treats a blank weapon proficiency as unknown, not disqualifying', () => {
    const martialSword = makeItem({ type: 'Melee Weapon', weaponCategory: 'martial' });
    const unset = makeCharacter({ weaponProficiencies: '' });
    expect(isUsableBy(martialSword, unset)).toBe(true);
  });

  it('never restricts item types with no modeled proficiency (e.g. potions)', () => {
    const potion = makeItem({ type: 'Potion' });
    const noProficiencies = makeCharacter({
      armorProficiencies: '',
      weaponProficiencies: '',
    });
    expect(isUsableBy(potion, noProficiencies)).toBe(true);
  });

  it('does not restrict a weapon without a category', () => {
    expect(
      isUsableBy(
        makeItem({ type: 'Ranged Weapon' }),
        makeCharacter({ weaponProficiencies: 'none' }),
      ),
    ).toBe(true);
  });
});

describe('isUsableByParty / usableByNames', () => {
  it('is usable if any single party member can use it', () => {
    const heavyArmor = makeItem({ type: 'Heavy Armor' });
    const rogue = makeCharacter({ name: 'Rogue', armorProficiencies: 'Light armor' });
    const fighter = makeCharacter({ name: 'Fighter', armorProficiencies: 'Heavy armor' });
    expect(isUsableByParty(heavyArmor, [rogue, fighter])).toBe(true);
    expect(usableByNames(heavyArmor, [rogue, fighter])).toEqual(['Fighter']);
  });

  it('is unusable when nobody in the party qualifies', () => {
    const heavyArmor = makeItem({ type: 'Heavy Armor' });
    const rogue = makeCharacter({ name: 'Rogue', armorProficiencies: 'Light armor' });
    const monk = makeCharacter({ name: 'Monk', armorProficiencies: 'none' });
    expect(isUsableByParty(heavyArmor, [rogue, monk])).toBe(false);
    expect(usableByNames(heavyArmor, [rogue, monk])).toEqual([]);
  });

  it('allows an empty party and labels an unnamed qualifying character', () => {
    const item = makeItem();
    expect(isUsableByParty(item, [])).toBe(true);
    expect(usableByNames(item, [makeCharacter({ name: '' })])).toEqual(['Unnamed']);
  });
});

describe('rarityAtMost', () => {
  it('allows rarities at or below the ceiling', () => {
    expect(rarityAtMost('Common', 'Uncommon')).toBe(true);
    expect(rarityAtMost('Uncommon', 'Uncommon')).toBe(true);
  });

  it('denies rarities above the ceiling', () => {
    expect(rarityAtMost('Legendary', 'Uncommon')).toBe(false);
    expect(rarityAtMost('Artifact', 'Rare')).toBe(false);
  });

  it('always allows mundane (no-rarity) gear regardless of ceiling', () => {
    expect(rarityAtMost('', 'Common')).toBe(true);
  });

  it('allows unknown rarity values and unknown ceilings', () => {
    expect(rarityAtMost('Unknown', 'Common')).toBe(true);
    expect(rarityAtMost('Rare', 'Unknown')).toBe(true);
  });

  it('matches localized rarity labels', () => {
    expect(rarityMatches('Niezwykły', ['Uncommon'])).toBe(true);
    expect(rarityMatches('Bardzo Rzadka', ['Very Rare'])).toBe(true);
    expect(rarityMatches('Legendarna', ['Rare'])).toBe(false);
  });

  it('recognizes localized excluded item types', () => {
    expect(isExcludedItemType('Medium Armor')).toBe(false);
    expect(isExcludedItemType('Light Armor')).toBe(false);
    expect(isExcludedItemType('Shield')).toBe(false);
    expect(isExcludedItemType('Pojazd (Powietrzny)')).toBe(true);
    expect(isExcludedItemType('Skarb (Monety)')).toBe(true);
    expect(isExcludedItemType('Mikstura')).toBe(false);
  });

  it('recognizes localized weapon categories and unknown proficiencies', () => {
    expect(isExcludedItemType('Broń do walki na dystans')).toBe(false);
    expect(isExcludedItemType('Broń do walki wręcz')).toBe(false);
    expect(
      isUsableBy(
        makeItem({ type: 'Broń do walki na dystans', weaponCategory: 'exotic' as never }),
        makeCharacter({ weaponProficiencies: '' }),
      ),
    ).toBe(true);
    expect(isExcludedItemType('Pojazd (Lądowy)')).toBe(true);
    expect(isExcludedItemType('Pojazd (Wodny)')).toBe(true);
    expect(isExcludedItemType('Pojazd (Kosmiczny)')).toBe(true);
    expect(isExcludedItemType('Wierzchowiec')).toBe(true);
    expect(isExcludedItemType('Uprząż')).toBe(true);
    expect(isExcludedItemType('Towar handlowy')).toBe(true);
    expect(isExcludedItemType('Sztabka handlowa')).toBe(true);
    expect(isExcludedItemType('Skarb monet')).toBe(true);
    expect(
      isUsableBy(
        makeItem({ type: 'Ranged Weapon', weaponCategory: 'simple' }),
        makeCharacter({ weaponProficiencies: 'Simple weapons' }),
      ),
    ).toBe(true);
  });
});
