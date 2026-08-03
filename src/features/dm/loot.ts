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

function canonicalItemType(type: string): string {
  const value = type.trim().toLowerCase();
  if (
    value.includes('vehicle (air)') ||
    (value.includes('pojazd') && value.includes('powietrz'))
  ) {
    return 'Vehicle (Air)';
  }
  if (
    value.includes('vehicle (land)') ||
    (value.includes('pojazd') && value.includes('ląd'))
  ) {
    return 'Vehicle (Land)';
  }
  if (
    value.includes('vehicle (water)') ||
    (value.includes('pojazd') && value.includes('wod'))
  ) {
    return 'Vehicle (Water)';
  }
  if (
    value.includes('vehicle (space)') ||
    (value.includes('pojazd') && value.includes('kosmicz'))
  ) {
    return 'Vehicle (Space)';
  }
  if (value === 'mount' || value.includes('wierzchowiec')) return 'Mount';
  if (
    value === 'tack and harness' ||
    value.includes('uprząż') ||
    value.includes('osprzęt')
  ) {
    return 'Tack and Harness';
  }
  if (value === 'trade good' || value.includes('towar handlowy')) return 'Trade Good';
  if (value === 'trade bar' || value.includes('sztabka handlowa')) return 'Trade Bar';
  if (
    value === 'treasure (coinage)' ||
    (value.includes('skarb') && value.includes('monet'))
  ) {
    return 'Treasure (Coinage)';
  }
  if (value.includes('heavy armor') || value.includes('ciężka zbroja'))
    return 'Heavy Armor';
  if (
    value.includes('medium armor') ||
    value.includes('średnia zbroja') ||
    value.includes('średni pancerz')
  ) {
    return 'Medium Armor';
  }
  if (value.includes('light armor') || value.includes('lekka zbroja'))
    return 'Light Armor';
  if (value === 'shield' || value.includes('tarcza')) return 'Shield';
  if (
    value === 'ranged weapon' ||
    value.includes('broń dystansowa') ||
    value.includes('broń do walki na dystans')
  ) {
    return 'Ranged Weapon';
  }
  if (
    value === 'melee weapon' ||
    value.includes('broń biała') ||
    value.includes('broń do walki wręcz')
  ) {
    return 'Melee Weapon';
  }
  return type;
}

export function isExcludedItemType(type: string): boolean {
  return EXCLUDED_ITEM_TYPES.has(canonicalItemType(type));
}

function canonicalRarity(rarity: string): string {
  const value = rarity.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('artifact') || value.includes('artefakt')) return 'Artifact';
  if (value.includes('very rare') || value.includes('bardzo rzad')) return 'Very Rare';
  if (value.includes('legendary') || value.includes('legendarn')) return 'Legendary';
  if (value === 'rare' || value.includes('rzadk')) return 'Rare';
  if (
    value === 'uncommon' ||
    value.includes('niepospol') ||
    value.includes('niezwykł') ||
    value.includes('niezwykl')
  ) {
    return 'Uncommon';
  }
  if (value === 'common' || value.includes('wspóln') || value.includes('wspoln')) {
    return 'Common';
  }
  return rarity;
}

export function rarityMatches(rarity: string, allowed: string[]): boolean {
  const canonical = canonicalRarity(rarity);
  return allowed.some((value) => canonical === canonicalRarity(value));
}

const ARMOR_KEYWORDS: Record<string, string[]> = {
  'Heavy Armor': ['heavy', 'cięż', 'all armor', 'wszystk'],
  'Medium Armor': ['medium', 'śred', 'all armor', 'wszystk'],
  'Light Armor': ['light', 'lek', 'all armor', 'wszystk'],
  Shield: ['shield', 'tarc', 'all armor', 'wszystk'],
};

const WEAPON_KEYWORDS: Record<'simple' | 'martial', string[]> = {
  simple: ['simple', 'prosty', 'prostą', 'proste', 'all weapons', 'wszystk'],
  martial: ['martial', 'wojen', 'bojow', 'all weapons', 'wszystk'],
};

function matchesKeyword(proficiencyText: string, keywords: string[]): boolean {
  const text = proficiencyText.trim().toLowerCase();
  if (!text) return true;
  return keywords.some((k) => text.includes(k));
}

export function isUsableBy(item: ItemEntry, character: Character): boolean {
  const armorKeywords = ARMOR_KEYWORDS[canonicalItemType(item.type)];
  if (armorKeywords) return matchesKeyword(character.armorProficiencies, armorKeywords);

  const itemType = canonicalItemType(item.type);
  if (
    (itemType === 'Melee Weapon' || itemType === 'Ranged Weapon') &&
    item.weaponCategory
  ) {
    const category =
      item.weaponCategory.toLowerCase().includes('simple') ||
      item.weaponCategory.toLowerCase().includes('prosty')
        ? 'simple'
        : item.weaponCategory.toLowerCase().includes('martial') ||
            item.weaponCategory.toLowerCase().includes('wojen')
          ? 'martial'
          : undefined;
    if (!category) return true;
    return matchesKeyword(character.weaponProficiencies, WEAPON_KEYWORDS[category]);
  }

  return true;
}

export function isUsableByParty(item: ItemEntry, characters: Character[]): boolean {
  if (characters.length === 0) return true;
  return characters.some((c) => isUsableBy(item, c));
}

export function usableByNames(
  item: ItemEntry,
  characters: Character[],
  unnamed = 'Unnamed',
): string[] {
  return characters.filter((c) => isUsableBy(item, c)).map((c) => c.name || unnamed);
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
  const rank = RARITY_ORDER.indexOf(canonicalRarity(rarity));
  const ceilingRank = RARITY_ORDER.indexOf(canonicalRarity(ceiling));
  if (rank === -1 || ceilingRank === -1) return true;
  return rank <= ceilingRank;
}
