import type { Locale } from '@/i18n/locales';

type Labels = Record<Locale, string>;

function filterKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ł', 'l');
}

function canonicalValue(value: string, aliases: Record<string, string>): string {
  return aliases[filterKey(value)] ?? value.trim();
}

function labelFor(value: string, locale: Locale, labels: Record<string, Labels>): string {
  return labels[value]?.[locale] ?? value;
}

const ITEM_TYPE_ALIASES: Record<string, string> = {
  'adventuring gear': 'Adventuring Gear',
  'ekwipunek podrozny': 'Adventuring Gear',
  'sprzet poszukiwawczy': 'Adventuring Gear',
  ammunition: 'Ammunition',
  amunicja: 'Ammunition',
  'ammunition (firearm)': 'Ammunition (Firearm)',
  'amunicja (bron palna)': 'Ammunition (Firearm)',
  "artisan's tools": "Artisan's Tools",
  'narzedzia rzemieslnicze': "Artisan's Tools",
  explosive: 'Explosive',
  'material wybuchowy': 'Explosive',
  'food and drink': 'Food and Drink',
  'jedzenie i napoje': 'Food and Drink',
  'jedzenie i picie': 'Food and Drink',
  'gaming set': 'Gaming Set',
  'zestaw do gier': 'Gaming Set',
  'generic variant': 'Generic Variant',
  'wariant ogolny': 'Generic Variant',
  'heavy armor': 'Heavy Armor',
  'ciezka zbroja': 'Heavy Armor',
  instrument: 'Instrument',
  'light armor': 'Light Armor',
  'lekka zbroja': 'Light Armor',
  'medium armor': 'Medium Armor',
  'srednia zbroja': 'Medium Armor',
  'sredni pancerz': 'Medium Armor',
  'melee weapon': 'Melee Weapon',
  'bron biala': 'Melee Weapon',
  'bron do walki wrecz': 'Melee Weapon',
  mount: 'Mount',
  wierzchowiec: 'Mount',
  other: 'Other',
  inne: 'Other',
  inny: 'Other',
  potion: 'Potion',
  mikstura: 'Potion',
  napoj: 'Potion',
  'ranged weapon': 'Ranged Weapon',
  'bron dystansowa': 'Ranged Weapon',
  ring: 'Ring',
  pierscien: 'Ring',
  rod: 'Rod',
  laska: 'Rod',
  pret: 'Rod',
  scroll: 'Scroll',
  zwoj: 'Scroll',
  shield: 'Shield',
  tarcza: 'Shield',
  'spellcasting focus': 'Spellcasting Focus',
  'ognisko rzucania zaklec': 'Spellcasting Focus',
  'tack and harness': 'Tack and Harness',
  'uprzaz i osprzet': 'Tack and Harness',
  tool: 'Tool',
  narzedzie: 'Tool',
  'trade bar': 'Trade Bar',
  'sztabka handlowa': 'Trade Bar',
  'trade good': 'Trade Good',
  'towar handlowy': 'Trade Good',
  'treasure (art object)': 'Treasure (Art Object)',
  'skarb (dzielo sztuki)': 'Treasure (Art Object)',
  'treasure (coinage)': 'Treasure (Coinage)',
  'skarb (monety)': 'Treasure (Coinage)',
  'treasure (gemstone)': 'Treasure (Gemstone)',
  'skarb (klejnot)': 'Treasure (Gemstone)',
  'vehicle (air)': 'Vehicle (Air)',
  'pojazd (powietrzny)': 'Vehicle (Air)',
  'vehicle (land)': 'Vehicle (Land)',
  'pojazd (lad)': 'Vehicle (Land)',
  'pojazd (ladowy)': 'Vehicle (Land)',
  'vehicle (space)': 'Vehicle (Space)',
  'pojazd (kosmiczny)': 'Vehicle (Space)',
  'vehicle (water)': 'Vehicle (Water)',
  'pojazd (wodny)': 'Vehicle (Water)',
  wand: 'Wand',
  rozdzka: 'Wand',
  'wondrous item': 'Wondrous Item',
  'cudowny przedmiot': 'Wondrous Item',
};

const ITEM_TYPE_LABELS: Record<string, Labels> = {
  'Adventuring Gear': { en: 'Adventuring Gear', pl: 'Ekwipunek Podróżny' },
  Ammunition: { en: 'Ammunition', pl: 'Amunicja' },
  'Ammunition (Firearm)': { en: 'Ammunition (Firearm)', pl: 'Amunicja (Broń Palna)' },
  "Artisan's Tools": { en: "Artisan's Tools", pl: 'Narzędzia Rzemieślnicze' },
  Explosive: { en: 'Explosive', pl: 'Materiał Wybuchowy' },
  'Food and Drink': { en: 'Food and Drink', pl: 'Jedzenie i Picie' },
  'Gaming Set': { en: 'Gaming Set', pl: 'Zestaw do Gier' },
  'Generic Variant': { en: 'Generic Variant', pl: 'Wariant Ogólny' },
  'Heavy Armor': { en: 'Heavy Armor', pl: 'Ciężka Zbroja' },
  Instrument: { en: 'Instrument', pl: 'Instrument' },
  'Light Armor': { en: 'Light Armor', pl: 'Lekka Zbroja' },
  'Medium Armor': { en: 'Medium Armor', pl: 'Średnia Zbroja' },
  'Melee Weapon': { en: 'Melee Weapon', pl: 'Broń do Walki Wręcz' },
  Mount: { en: 'Mount', pl: 'Wierzchowiec' },
  Other: { en: 'Other', pl: 'Inny' },
  Potion: { en: 'Potion', pl: 'Mikstura' },
  'Ranged Weapon': { en: 'Ranged Weapon', pl: 'Broń Dystansowa' },
  Ring: { en: 'Ring', pl: 'Pierścień' },
  Rod: { en: 'Rod', pl: 'Pręt' },
  Scroll: { en: 'Scroll', pl: 'Zwój' },
  Shield: { en: 'Shield', pl: 'Tarcza' },
  'Spellcasting Focus': { en: 'Spellcasting Focus', pl: 'Ognisko Rzucania Zaklęć' },
  'Tack and Harness': { en: 'Tack and Harness', pl: 'Uprząż i Osprzęt' },
  Tool: { en: 'Tool', pl: 'Narzędzie' },
  'Trade Bar': { en: 'Trade Bar', pl: 'Sztabka Handlowa' },
  'Trade Good': { en: 'Trade Good', pl: 'Towar Handlowy' },
  'Treasure (Art Object)': { en: 'Treasure (Art Object)', pl: 'Skarb (Dzieło Sztuki)' },
  'Treasure (Coinage)': { en: 'Treasure (Coinage)', pl: 'Skarb (Monety)' },
  'Treasure (Gemstone)': { en: 'Treasure (Gemstone)', pl: 'Skarb (Klejnot)' },
  'Vehicle (Air)': { en: 'Vehicle (Air)', pl: 'Pojazd (Powietrzny)' },
  'Vehicle (Land)': { en: 'Vehicle (Land)', pl: 'Pojazd (Lądowy)' },
  'Vehicle (Space)': { en: 'Vehicle (Space)', pl: 'Pojazd (Kosmiczny)' },
  'Vehicle (Water)': { en: 'Vehicle (Water)', pl: 'Pojazd (Wodny)' },
  Wand: { en: 'Wand', pl: 'Różdżka' },
  'Wondrous Item': { en: 'Wondrous Item', pl: 'Cudowny Przedmiot' },
};

const RARITY_ALIASES: Record<string, string> = {
  artifact: 'Artifact',
  artefakt: 'Artifact',
  common: 'Common',
  pospolita: 'Common',
  wspolny: 'Common',
  legendary: 'Legendary',
  legendarna: 'Legendary',
  legendarny: 'Legendary',
  rare: 'Rare',
  rzadka: 'Rare',
  rzadki: 'Rare',
  uncommon: 'Uncommon',
  niepospolita: 'Uncommon',
  niezwykly: 'Uncommon',
  'unknown (magic)': 'Unknown (magic)',
  'nieznany (magia)': 'Unknown (magic)',
  'nieznana (magiczna)': 'Unknown (magic)',
  varies: 'Varies',
  roznie: 'Varies',
  zmienna: 'Varies',
  'very rare': 'Very Rare',
  'bardzo rzadkie': 'Very Rare',
  'bardzo rzadka': 'Very Rare',
};

const RARITY_LABELS: Record<string, Labels> = {
  Artifact: { en: 'Artifact', pl: 'Artefakt' },
  Common: { en: 'Common', pl: 'Pospolita' },
  Legendary: { en: 'Legendary', pl: 'Legendarna' },
  Rare: { en: 'Rare', pl: 'Rzadka' },
  Uncommon: { en: 'Uncommon', pl: 'Niepospolita' },
  'Unknown (magic)': { en: 'Unknown (magic)', pl: 'Nieznana (magiczna)' },
  Varies: { en: 'Varies', pl: 'Różnie' },
  'Very Rare': { en: 'Very Rare', pl: 'Bardzo Rzadka' },
};

const PROPERTY_ALIASES: Record<string, string> = {
  ammunition: 'Ammunition',
  amunicja: 'Ammunition',
  'ammunition (firearm)': 'Ammunition (Firearm)',
  'amunicja (bron palna)': 'Ammunition (Firearm)',
  'burst fire': 'Burst Fire',
  'ogien seryjny': 'Burst Fire',
  finesse: 'Finesse',
  finezja: 'Finesse',
  finezyjna: 'Finesse',
  finezyjne: 'Finesse',
  heavy: 'Heavy',
  ciezka: 'Heavy',
  ciezki: 'Heavy',
  light: 'Light',
  lekka: 'Light',
  lekkosc: 'Light',
  swiatlo: 'Light',
  loading: 'Loading',
  ladowanie: 'Loading',
  reach: 'Reach',
  zasieg: 'Reach',
  reload: 'Reload',
  przeladowanie: 'Reload',
  special: 'Special',
  specjalna: 'Special',
  thrown: 'Thrown',
  rzucana: 'Thrown',
  rzucane: 'Thrown',
  rzucenie: 'Thrown',
  rzucony: 'Thrown',
  twohanded: 'Two-Handed',
  'two-handed': 'Two-Handed',
  dwureczna: 'Two-Handed',
  dwureczny: 'Two-Handed',
  versatile: 'Versatile',
  wszechstronna: 'Versatile',
  wszechstronne: 'Versatile',
  wszechstronnosc: 'Versatile',
  wszechstronny: 'Versatile',
};

const PROPERTY_LABELS: Record<string, Labels> = {
  Ammunition: { en: 'Ammunition', pl: 'Amunicja' },
  'Ammunition (Firearm)': { en: 'Ammunition (Firearm)', pl: 'Amunicja (Broń Palna)' },
  'Burst Fire': { en: 'Burst Fire', pl: 'Ogień Seryjny' },
  Finesse: { en: 'Finesse', pl: 'Finezja' },
  Heavy: { en: 'Heavy', pl: 'Ciężka' },
  Light: { en: 'Light', pl: 'Lekka' },
  Loading: { en: 'Loading', pl: 'Ładowanie' },
  Reach: { en: 'Reach', pl: 'Zasięg' },
  Reload: { en: 'Reload', pl: 'Przeładowanie' },
  Special: { en: 'Special', pl: 'Specjalna' },
  Thrown: { en: 'Thrown', pl: 'Rzucana' },
  'Two-Handed': { en: 'Two-Handed', pl: 'Dwuręczna' },
  Versatile: { en: 'Versatile', pl: 'Wszechstronna' },
};

const SCHOOL_ALIASES: Record<string, string> = {
  abjuration: 'Abjuration',
  oslona: 'Abjuration',
  'wyrzeczenie sie': 'Abjuration',
  conjuration: 'Conjuration',
  przywolanie: 'Conjuration',
  zaklinanie: 'Conjuration',
  divination: 'Divination',
  wrozbiarstwo: 'Divination',
  enchantment: 'Enchantment',
  zaczarowanie: 'Enchantment',
  evocation: 'Evocation',
  przywolywanie: 'Evocation',
  wywolywanie: 'Evocation',
  illusion: 'Illusion',
  iluzja: 'Illusion',
  necromancy: 'Necromancy',
  nekromancja: 'Necromancy',
  transmutation: 'Transmutation',
  przemiana: 'Transmutation',
  transmutacja: 'Transmutation',
};

const SCHOOL_LABELS: Record<string, Labels> = {
  Abjuration: { en: 'Abjuration', pl: 'Osłona' },
  Conjuration: { en: 'Conjuration', pl: 'Przywołanie' },
  Divination: { en: 'Divination', pl: 'Wróżbiarstwo' },
  Enchantment: { en: 'Enchantment', pl: 'Zaczarowanie' },
  Evocation: { en: 'Evocation', pl: 'Wywoływanie' },
  Illusion: { en: 'Illusion', pl: 'Iluzja' },
  Necromancy: { en: 'Necromancy', pl: 'Nekromancja' },
  Transmutation: { en: 'Transmutation', pl: 'Przemiana' },
};

export function canonicalItemType(value: string): string {
  return canonicalValue(value, ITEM_TYPE_ALIASES);
}

export function itemTypeLabel(value: string, locale: Locale = 'en'): string {
  return labelFor(value, locale, ITEM_TYPE_LABELS);
}

export function canonicalItemRarity(value: string): string {
  return canonicalValue(value, RARITY_ALIASES);
}

export function itemRarityLabel(value: string, locale: Locale = 'en'): string {
  return labelFor(value, locale, RARITY_LABELS);
}

export function canonicalItemProperty(value: string): string {
  return canonicalValue(value, PROPERTY_ALIASES);
}

export function itemPropertyLabel(value: string, locale: Locale = 'en'): string {
  return labelFor(value, locale, PROPERTY_LABELS);
}

export function canonicalSpellSchool(value: string): string {
  return canonicalValue(value, SCHOOL_ALIASES);
}

export function spellSchoolLabel(value: string, locale: Locale = 'en'): string {
  return labelFor(value, locale, SCHOOL_LABELS);
}
