import type { Locale } from '@/i18n/locales';

const POLISH_VALUES: Record<string, Record<string, string>> = {
  conditionKind: {
    condition: 'stan',
    disease: 'choroba',
    status: 'status',
  },
  languageType: {
    Exotic: 'Egzotyczny',
    Language: 'Język',
    Rare: 'Rzadki',
    Secret: 'Sekretny',
    Standard: 'standardowy',
  },
  objectSize: {
    'Mały lub Mały': 'Malutki lub Mały',
    Gargantuan: 'Gigantyczny',
    Huge: 'Wielki',
    Large: 'Duży',
    Medium: 'Średni',
    'Medium or Small': 'Średni lub Mały',
    Small: 'Mały',
    'Small or Medium': 'Mały lub Średni',
    Tiny: 'Malutki',
    Varies: 'Zmienny',
  },
  vehicleType: {
    'Zaklęcie zaklęć': 'Spelljammer',
  },
  creatureType: {
    Aberration: 'Aberracja',
    Beast: 'Bestia',
    Celestial: 'Niebianin',
    Construct: 'Konstrukt',
    Dragon: 'Smok',
    Elemental: 'Żywiołak',
    Fey: 'Fej',
    Fiend: 'Czart',
    Giant: 'Olbrzym',
    Humanoid: 'Humanoid',
    Monstrosity: 'Monstrum',
    Ooze: 'Maź',
    Plant: 'Roślina',
    Undead: 'Nieumarły',
  },
  school: {
    Abjuration: 'Osłona',
    Conjuration: 'Przywołanie',
    Divination: 'Wróżbiarstwo',
    Enchantment: 'Zaczarowanie',
    Evocation: 'Wywoływanie',
    Illusion: 'Iluzja',
    Necromancy: 'Nekromancja',
    Transmutation: 'Przemiana',
  },
  type: {
    'Adventuring Gear': 'Ekwipunek podróżny',
    Armor: 'Pancerz',
    'Melee Weapon': 'Broń do walki wręcz',
    Staff: 'Kostur',
    Weapon: 'Broń',
    'Weapon (Dagger or Sickle)': 'Broń (sztylet lub sierp)',
    'Weapon Modification': 'Modyfikacja broni',
    'Wondrous Item': 'Cudowny przedmiot',
  },
  rarity: {
    Artifact: 'Artefakt',
    Common: 'Pospolita',
    Legendary: 'Legendarna',
    Rare: 'Rzadka',
    Uncommon: 'Niepospolita',
    'Uncommon (+1), Rare (+2), or Very Rare (+3)':
      'Niepospolita (+1), rzadka (+2) lub bardzo rzadka (+3)',
    'Uncommon or Rare': 'Niepospolita lub rzadka',
    Varies: 'Różnie',
    'Very Rare': 'Bardzo rzadka',
  },
  weaponCategory: {
    martial: 'wojowa',
    simple: 'prosta',
  },
  featCategory: {
    General: 'Ogólny',
    Origin: 'Pochodzenia',
  },
  featureType: {
    'Class Feature': 'Cecha klasy',
    'Fighting Style': 'Styl walki',
    Subclass: 'Podklasa',
  },
  ruleType: {
    Core: 'Podstawowa',
    'Fumble rule': 'Zasada Fumble',
    Optional: 'Opcjonalna',
    Variant: 'Wariant',
  },
};

const POLISH_PROPERTIES: Record<string, string> = {
  Automatic: 'Automatyczna',
  'Burst Fire': 'Ogień seryjny',
  Finesse: 'Finezja',
  Heavy: 'Ciężka',
  Light: 'Lekka',
  Loading: 'Ładowanie',
  Reach: 'Zasięg',
  Reload: 'Przeładowanie',
  Special: 'Specjalna',
  Thrown: 'Rzucana',
  'Two-Handed': 'Dwuręczna',
  Versatile: 'Wszechstronna',
};

const POLISH_CASTING_TIMES: Record<string, string> = {
  '1 reaction, which you take when a creature you can see dies within 120 feet of you.':
    '1 reakcja, którą wykonujesz, gdy stworzenie, które widzisz, umiera w odległości do 120 stóp od ciebie.',
  'Reaction, which you take when a creature within range is reduced to 0 Hit Points or fails a Death Saving Throw':
    'Reakcja, którą wykonujesz, gdy stworzenie w zasięgu zostanie zredukowane do 0 PW lub nie zda rzutu obronnego przed śmiercią',
};

function localizeMeasure(value: string): string {
  return value.replace(
    /(\d+)\s+(feet|foot|miles?|minutes?|hours?|days?)\b/gi,
    (_, amount, unit) => {
      const number = Number(amount);
      const units: Record<string, string> = {
        day: number === 1 ? 'dzień' : 'dni',
        days: 'dni',
        feet: number === 1 ? 'stopa' : 'stóp',
        foot: number === 1 ? 'stopa' : 'stóp',
        hour: number === 1 ? 'godzina' : 'godzin',
        hours: 'godzin',
        mile: number === 1 ? 'mila' : 'mil',
        miles: 'mil',
        minute: number === 1 ? 'minuta' : 'minut',
        minutes: 'minut',
      };
      return `${amount} ${units[unit.toLowerCase()] ?? unit}`;
    },
  );
}

function localizeDurationMeasure(value: string): string {
  return value.replace(/(\d+)\s+(minutes?|hours?|days?)\b/gi, (_, amount, unit) => {
    const units: Record<string, string> = {
      day: 'dnia',
      days: 'dni',
      hour: 'godziny',
      hours: 'godzin',
      minute: 'minuty',
      minutes: 'minut',
    };
    return `${amount} ${units[unit.toLowerCase()] ?? unit}`;
  });
}

function localizeSpeed(value: string): string {
  return value
    .replace(/(\d+)-foot radius/gi, 'promień $1 stóp')
    .replace(/(\d+)-foot (cone|sphere)/gi, (_, amount, shape) => {
      const shapes: Record<string, string> = { cone: 'stożek', sphere: 'kula' };
      return `${shapes[shape.toLowerCase()] ?? shape} ${amount} stóp`;
    })
    .replace(/\bClimb\b/gi, 'wspinaczka')
    .replace(/\bFly\b/gi, 'lot')
    .replace(/\bSwim\b/gi, 'pływanie')
    .replace(/\bBurrow\b/gi, 'kopanie')
    .replace(/\bLand only\b/gi, 'tylko ląd')
    .replace(/\bAir only\b/gi, 'tylko powietrze')
    .replace(/\bWater only\b/gi, 'tylko woda')
    .replace(/(\d+)\s+(?:feet?|ft\.?)(?=\s|[;,.()]|$)/gi, '$1 stóp');
}

function localizeCreatureType(value: string): string {
  const match = /^(\w+)(\s*\(.*\))?$/.exec(value);
  if (!match) return value;
  const base = POLISH_VALUES.creatureType?.[match[1]!];
  return base ? `${base}${match[2] ?? ''}` : value;
}

function localizeFieldValue(value: string, field: string): string {
  if (field === 'creatureType') return localizeCreatureType(value);
  if (field === 'speed') return localizeSpeed(value);
  if (field === 'size') field = 'objectSize';
  if (field === 'castingTime') {
    if (POLISH_CASTING_TIMES[value]) return POLISH_CASTING_TIMES[value];
    if (value === 'Action') return 'Akcja';
    if (value === 'Bonus Action') return 'Akcja dodatkowa';
    if (value === 'Reaction') return 'Reakcja';
    if (/^\d+\s+action\b/i.test(value)) return value.replace(/action/gi, 'akcja');
    if (/^\d+\s+bonus\b/i.test(value)) return value.replace(/bonus/gi, 'akcja dodatkowa');
    if (/^\d+\s+reaction\b/i.test(value)) return value.replace(/reaction/gi, 'reakcja');
    if (/^reaction\b/i.test(value)) return value.replace(/^reaction/i, 'Reakcja');
    return localizeMeasure(value);
  }
  if (field === 'duration') {
    if (value === 'Instantaneous') return 'Natychmiastowa';
    if (value === 'Special') return 'Specjalna';
    if (value === 'Until dispelled') return 'Do rozproszenia';
    const concentration = /^Concentration, up to (.+)$/i.exec(value);
    return concentration
      ? `Koncentracja, do ${localizeDurationMeasure(concentration[1]!).replace(/\bor\b/gi, 'lub')}`
      : localizeDurationMeasure(value).replace(/\bor\b/gi, 'lub');
  }
  if (field === 'range') {
    if (value === 'Self') return 'Siebie';
    if (value === 'Touch') return 'Dotyk';
    if (value === 'Sight') return 'Widoczność';
    if (value === 'Unlimited') return 'Nieograniczony';
    return localizeSpeed(value);
  }
  if (field === 'properties') {
    return value
      .split(',')
      .map((part) => POLISH_PROPERTIES[part.trim()] ?? part.trim())
      .join(', ');
  }
  const exact = POLISH_VALUES[field]?.[value];
  if (exact) return exact;
  if (field === 'featureType' && value.includes(',')) {
    return value
      .split(',')
      .map((part) => POLISH_VALUES.featureType?.[part.trim()] ?? part.trim())
      .join(', ');
  }
  return value;
}

export function localizeCompendiumValue(
  value: string | undefined,
  locale: Locale,
  field: string,
): string | undefined {
  if (!value || locale !== 'pl') return value;
  const lookupField =
    field === 'kind' ? 'conditionKind' : field === 'size' ? 'objectSize' : field;
  return localizeFieldValue(value, lookupField);
}
