import type { Character } from '@/features/character/model';
import type { ItemEntry } from '@/data/compendium/types';

export interface Tier {
  id: number;
  minLevel: number;
  maxLevel: number;
  rarities: string[];
  coinDice: string;
  coinMultiplier: number;
  gemValue: number;
  itemDice: string;
}

export const TIERS: Tier[] = [
  {
    id: 1,
    minLevel: 1,
    maxLevel: 4,
    rarities: ['Common', 'Uncommon'],
    coinDice: '4d6',
    coinMultiplier: 10,
    gemValue: 10,
    itemDice: '1d2',
  },
  {
    id: 2,
    minLevel: 5,
    maxLevel: 10,
    rarities: ['Uncommon', 'Rare'],
    coinDice: '2d6',
    coinMultiplier: 100,
    gemValue: 50,
    itemDice: '1d3',
  },
  {
    id: 3,
    minLevel: 11,
    maxLevel: 16,
    rarities: ['Rare', 'Very Rare'],
    coinDice: '2d6',
    coinMultiplier: 1000,
    gemValue: 500,
    itemDice: '1d4',
  },
  {
    id: 4,
    minLevel: 17,
    maxLevel: 20,
    rarities: ['Very Rare', 'Legendary'],
    coinDice: '4d6',
    coinMultiplier: 5000,
    gemValue: 1000,
    itemDice: '1d4',
  },
];

export function tierForLevel(level: number): Tier {
  return TIERS.find((t) => level <= t.maxLevel) ?? TIERS[TIERS.length - 1]!;
}

export const EXCLUDED_ITEM_TYPES = new Set([
  'Vehicle (Air)',
  'Vehicle (Land)',
  'Vehicle (Water)',
  'Vehicle (Space)',
  'Mount',
  'Tack and Harness',
  'Trade Good',
  'Trade Bar',
  'Treasure (Coinage)',
]);

const ARMOR_KEYWORDS: Record<string, string[]> = {
  'Heavy Armor': ['heavy', 'all armor'],
  'Medium Armor': ['medium', 'all armor'],
  'Light Armor': ['light', 'all armor'],
  Shield: ['shield', 'all armor'],
};

const WEAPON_KEYWORDS: Record<'simple' | 'martial', string[]> = {
  simple: ['simple', 'all weapons'],
  martial: ['martial', 'all weapons'],
};

function matchesKeyword(proficiencyText: string, keywords: string[]): boolean {
  const text = proficiencyText.trim().toLowerCase();
  if (!text) return true;
  return keywords.some((k) => text.includes(k));
}

export function isUsableBy(item: ItemEntry, character: Character): boolean {
  const armorKeywords = ARMOR_KEYWORDS[item.type];
  if (armorKeywords) return matchesKeyword(character.armorProficiencies, armorKeywords);

  if (
    (item.type === 'Melee Weapon' || item.type === 'Ranged Weapon') &&
    item.weaponCategory
  ) {
    return matchesKeyword(
      character.weaponProficiencies,
      WEAPON_KEYWORDS[item.weaponCategory],
    );
  }

  return true;
}

export function isUsableByParty(item: ItemEntry, characters: Character[]): boolean {
  if (characters.length === 0) return true;
  return characters.some((c) => isUsableBy(item, c));
}

export function usableByNames(item: ItemEntry, characters: Character[]): string[] {
  return characters.filter((c) => isUsableBy(item, c)).map((c) => c.name || 'Unnamed');
}

export const RARITY_ORDER = [
  '',
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
];

export function rarityAtMost(rarity: string, ceiling: string): boolean {
  const rank = RARITY_ORDER.indexOf(rarity);
  const ceilingRank = RARITY_ORDER.indexOf(ceiling);
  if (rank === -1 || ceilingRank === -1) return true;
  return rank <= ceilingRank;
}
