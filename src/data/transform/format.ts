import { XP_BY_CR } from '../../features/dm/xp';
import { stripMarkup } from './util';
import type { Locale } from '@/i18n/locales';

const PLURAL_UNITS: Record<string, [string, string]> = {
  action: ['akcję', 'akcje'],
  bonus: ['akcję dodatkową', 'akcje dodatkowe'],
  reaction: ['reakcję', 'reakcje'],
  round: ['rundę', 'rundy'],
  minute: ['minutę', 'minuty'],
  hour: ['godzinę', 'godziny'],
  day: ['dzień', 'dni'],
  week: ['tydzień', 'tygodnie'],
  month: ['miesiąc', 'miesiące'],
  year: ['rok', 'lata'],
};

const PL_ABILITIES: Record<string, string> = {
  str: 'Siła',
  dex: 'Zręczność',
  con: 'Kondycja',
  int: 'Inteligencja',
  wis: 'Mądrość',
  cha: 'Charyzma',
};

const PL_SIZES: Record<string, string> = {
  T: 'Maleńki',
  S: 'Mały',
  M: 'Średni',
  L: 'Duży',
  H: 'Wielki',
  G: 'Ogromny',
};

const PL_FEAT_CATEGORIES: Record<string, string> = {
  O: 'Pochodzenie',
  G: 'Ogólny',
  FS: 'Styl walki',
  EB: 'Epicki dar',
  V: 'Wariant',
};

const PL_RULE_TYPES: Record<string, string> = {
  C: 'Podstawowe',
  O: 'Opcjonalne',
  V: 'Wariantowe',
  VO: 'Opcjonalne wariantowe',
};

const PL_DISTANCE_UNITS: Record<string, [string, string]> = {
  feet: ['stopa', 'stóp'],
  foot: ['stopa', 'stóp'],
  meter: ['metr', 'metrów'],
  meters: ['metr', 'metrów'],
  mile: ['mila', 'mil'],
  miles: ['mila', 'mil'],
};

const PL_DAMAGE_TYPES: Record<string, string> = {
  B: 'obuchowe',
  P: 'kłute',
  S: 'sieczne',
  A: 'kwasowe',
  C: 'od zimna',
  F: 'od ognia',
  O: 'od mocy',
  L: 'od błyskawic',
  N: 'nekrotyczne',
  I: 'od trucizny',
  Y: 'psychiczne',
  R: 'promieniste',
  T: 'od gromu',
};

const PL_MONSTER_TYPES: Record<string, string> = {
  aberration: 'aberracja',
  beast: 'bestia',
  celestial: 'niebianin',
  construct: 'konstrukt',
  dragon: 'smok',
  elemental: 'żywiołak',
  fey: 'fey',
  fiend: 'diabeł',
  giant: 'olbrzym',
  humanoid: 'humanoid',
  monstrosity: 'monstrum',
  ooze: 'szlam',
  plant: 'roślina',
  undead: 'nieumarły',
};

interface TimeEntry {
  number: number;
  unit: string;
  condition?: string;
}

export function formatCastingTime(
  time: TimeEntry[] | undefined,
  locale: Locale = 'en',
): string {
  if (!time?.length) return '-';
  return time
    .map((t) => {
      const units = PLURAL_UNITS[t.unit];
      if (locale === 'pl' && units) {
        const [singular, plural] = units;
        const unit = t.number === 1 ? singular : plural;
        const base = `${t.number} ${unit}`;
        return t.condition ? `${base}, ${t.condition}` : base;
      }
      const unit = t.number === 1 ? t.unit : `${t.unit}s`;
      const base = `${t.number} ${unit}`;
      return t.condition ? `${base}, ${t.condition}` : base;
    })
    .join(locale === 'pl' ? ' lub ' : ' or ');
}

interface Range {
  type: string;
  distance?: { type: string; amount?: number };
}

export function formatRange(range: Range | undefined, locale: Locale = 'en'): string {
  if (!range) return '-';
  const dist = range.distance;
  if (!dist)
    return locale === 'pl'
      ? capitalize(PL_RANGE_TYPES[range.type] ?? range.type)
      : capitalize(range.type);

  switch (dist.type) {
    case 'self':
      return shapeSuffix(locale === 'pl' ? 'Siebie' : 'Self', range, locale);
    case 'touch':
      return locale === 'pl' ? 'Dotyk' : 'Touch';
    case 'sight':
      return locale === 'pl' ? 'Widoczność' : 'Sight';
    case 'unlimited':
      return locale === 'pl' ? 'Nieograniczony' : 'Unlimited';
    default: {
      const measure = formatDistance(dist.type, dist.amount, locale);
      return range.type === 'point' ? measure : shapeSuffix(measure, range, locale);
    }
  }
}

const PL_RANGE_TYPES: Record<string, string> = {
  point: 'punkt',
  cone: 'stożek',
  cube: 'sześcian',
  cylinder: 'walec',
  line: 'linia',
  sphere: 'sfera',
};

function shapeSuffix(prefix: string, range: Range, locale: Locale): string {
  const amount = range.distance?.amount;
  const type = locale === 'pl' ? (PL_RANGE_TYPES[range.type] ?? range.type) : range.type;
  if (amount == null) return `${prefix} (${type})`;
  return locale === 'pl'
    ? `${prefix} (${type}, ${amount} stóp)`
    : `${prefix} (${amount}-foot ${type})`;
}

function formatDistance(
  type: string,
  amount: number | undefined,
  locale: Locale,
): string {
  if (locale !== 'pl') {
    const unit =
      amount === 1 ? (type === 'feet' ? 'foot' : type.replace(/s$/, '')) : type;
    return `${amount} ${unit}`;
  }
  const units = PL_DISTANCE_UNITS[type];
  if (!units) return `${amount} ${amount === 1 ? type.replace(/s$/, '') : type}`;
  return `${amount} ${amount === 1 ? units[0] : units[1]}`;
}

interface Components {
  v?: boolean;
  s?: boolean;
  m?: boolean | string | { text?: string };
}

export function formatComponents(components: Components | undefined): string {
  if (!components) return '-';
  const parts: string[] = [];
  if (components.v) parts.push('V');
  if (components.s) parts.push('S');
  if (components.m) {
    if (typeof components.m === 'string') parts.push(`M (${components.m})`);
    else if (typeof components.m === 'object' && components.m.text)
      parts.push(`M (${components.m.text})`);
    else parts.push('M');
  }
  return parts.join(', ') || '-';
}

interface Duration {
  type: string;
  duration?: { type: string; amount?: number };
  concentration?: boolean;
}

export function formatDuration(
  duration: Duration[] | undefined,
  locale: Locale = 'en',
): string {
  if (!duration?.length) return '-';
  return duration
    .map((d) => {
      switch (d.type) {
        case 'instant':
          return locale === 'pl' ? 'Natychmiastowa' : 'Instantaneous';
        case 'permanent':
          return locale === 'pl' ? 'Do rozproszenia' : 'Until dispelled';
        case 'special':
          return locale === 'pl' ? 'Specjalna' : 'Special';
        case 'timed': {
          if (!d.duration) return locale === 'pl' ? 'Specjalna' : 'Special';
          const units = PLURAL_UNITS[d.duration.type];
          if (locale === 'pl' && units) {
            const [singular, plural] = units;
            const measure = `${d.duration.amount} ${d.duration.amount === 1 ? singular : plural}`;
            return d.concentration ? `Koncentracja, do ${measure}` : measure;
          }
          const unit = d.duration.amount === 1 ? d.duration.type : `${d.duration.type}s`;
          const measure = `${d.duration.amount} ${unit}`;
          return d.concentration ? `Concentration, up to ${measure}` : measure;
        }
        default:
          return capitalize(d.type);
      }
    })
    .join(locale === 'pl' ? ' lub ' : ' or ');
}

export function hasConcentration(duration: Duration[] | undefined): boolean {
  return Boolean(duration?.some((d) => d.concentration));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const ABILITIES: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const SIZES: Record<string, string> = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan',
};

export const FEAT_CATEGORIES: Record<string, string> = {
  O: 'Origin',
  G: 'General',
  FS: 'Fighting Style',
  EB: 'Epic Boon',
  V: 'Variant',
};

export const RULE_TYPES: Record<string, string> = {
  C: 'Core',
  O: 'Optional',
  V: 'Variant',
  VO: 'Variant Optional',
};

export function formatSize(size: string[] | undefined, locale: Locale = 'en'): string {
  if (!size?.length) return '-';
  return size
    .map((s) => (locale === 'pl' ? (PL_SIZES[s] ?? SIZES[s] ?? s) : (SIZES[s] ?? s)))
    .join(locale === 'pl' ? ' lub ' : ' or ');
}

type Speed = number | Record<string, number | boolean> | undefined;

const PL_SPEED_MODES: Record<string, string> = {
  burrow: 'kopanie',
  climb: 'wspinaczka',
  fly: 'lot',
  swim: 'pływanie',
};

export function formatSpeed(speed: Speed, locale: Locale = 'en'): string {
  if (speed == null) return '-';
  if (typeof speed === 'number')
    return locale === 'pl' ? `${speed} stóp` : `${speed} ft.`;
  const parts: string[] = [];
  for (const [mode, value] of Object.entries(speed)) {
    if (typeof value === 'number') {
      if (locale === 'pl') {
        parts.push(
          mode === 'walk'
            ? `${value} stóp`
            : `${PL_SPEED_MODES[mode] ?? mode} ${value} stóp`,
        );
      } else {
        parts.push(mode === 'walk' ? `${value} ft.` : `${mode} ${value} ft.`);
      }
    }
  }
  return parts.join(', ') || '-';
}

export function formatProficiencies(
  list: Array<Record<string, unknown>> | undefined,
  locale: Locale = 'en',
): string {
  if (!list?.length) return '';
  const out: string[] = [];
  for (const group of list) {
    const fixed: string[] = [];
    for (const [key, value] of Object.entries(group)) {
      if (key === 'choose' && value && typeof value === 'object') {
        const choose = value as { from?: string[]; count?: number };
        const count = choose.count ?? 1;
        const from = (choose.from ?? [])
          .map((value) => titleizeProf(value, locale))
          .join(', ');
        out.push(
          locale === 'pl' ? `wybierz ${count} z ${from}` : `choose ${count} from ${from}`,
        );
      } else if (value === true) {
        fixed.push(titleizeProf(key, locale));
      }
    }
    if (fixed.length) out.push(fixed.join(', '));
  }
  return out.join('; ');
}

export function formatAbilityChoices(
  ability: Array<Record<string, unknown>> | undefined,
  locale: Locale = 'en',
): string {
  if (!ability?.length) return '';
  const froms = new Set<string>();
  for (const entry of ability) {
    const choose = entry.choose as { from?: string[]; weighted?: { from?: string[] } };
    const from = choose?.from ?? choose?.weighted?.from ?? [];
    for (const ab of from)
      froms.add(
        locale === 'pl'
          ? (PL_ABILITIES[ab] ?? ABILITIES[ab] ?? ab)
          : (ABILITIES[ab] ?? ab),
      );
  }
  return froms.size
    ? `${locale === 'pl' ? 'Wybierz spośród' : 'Choose from'} ${[...froms].join(', ')}`
    : '';
}

export function formatFeatCategory(
  category: string | undefined,
  locale: Locale = 'en',
): string {
  if (!category) return locale === 'pl' ? 'Atut' : 'Feat';
  return locale === 'pl'
    ? (PL_FEAT_CATEGORIES[category] ?? FEAT_CATEGORIES[category] ?? category)
    : (FEAT_CATEGORIES[category] ?? category);
}

export function formatRuleType(type: string | undefined, locale: Locale = 'en'): string {
  if (!type) return locale === 'pl' ? 'Zasada' : 'Rule';
  return locale === 'pl'
    ? (PL_RULE_TYPES[type] ?? RULE_TYPES[type] ?? type)
    : (RULE_TYPES[type] ?? type);
}

export function formatFeatRefs(
  feats: Array<Record<string, unknown>> | undefined,
): string {
  if (!feats?.length) return '';
  const names: string[] = [];
  for (const group of feats) {
    for (const key of Object.keys(group)) {
      const base = key.split('|')[0]!;
      const [name, sub] = base.split(';').map((part) => part.trim());
      const titled = titleCase(name!);
      names.push(sub ? `${titled} (${titleCase(sub)})` : titled);
    }
  }
  return names.join(', ');
}

export function formatPrerequisite(
  prereq: Array<Record<string, unknown>> | undefined,
  locale: Locale = 'en',
): string {
  if (!prereq?.length) return '';

  const groups = prereq.map((req) => {
    const parts: string[] = [];
    if (typeof req.level === 'number')
      parts.push(`${locale === 'pl' ? 'Poziom' : 'Level'} ${req.level}+`);
    if (Array.isArray(req.ability)) {
      for (const ab of req.ability as Array<Record<string, number>>) {
        for (const [key, value] of Object.entries(ab)) {
          const ability =
            locale === 'pl'
              ? (PL_ABILITIES[key] ?? ABILITIES[key] ?? key)
              : (ABILITIES[key] ?? key);
          parts.push(`${ability} ${value}+`);
        }
      }
    }

    if (Array.isArray(req.level)) {
      for (const lvl of req.level as Array<{
        level?: number;
        class?: { name?: string };
      }>) {
        const cls = lvl.class?.name ? ` ${lvl.class.name}` : '';
        parts.push(`${locale === 'pl' ? 'Poziom' : 'Level'} ${lvl.level}+${cls}`);
      }
    }
    if (typeof req.pact === 'string')
      parts.push(locale === 'pl' ? `Pakt ${req.pact}` : `Pact of the ${req.pact}`);
    if (typeof req.patron === 'string')
      parts.push(locale === 'pl' ? `patron: ${req.patron}` : `${req.patron} patron`);
    if (Array.isArray(req.spell)) {
      const summaries = (
        req.spell as Array<string | { entrySummary?: string; entry?: string }>
      )
        .map((s) => (typeof s === 'string' ? s : (s.entrySummary ?? s.entry ?? '')))
        .filter(Boolean);
      if (summaries.length) parts.push(summaries.join(', '));
    }
    if (req.spellcasting === true || req.spellcasting2020 === true) {
      parts.push(locale === 'pl' ? 'Cecha rzucania zaklęć' : 'Spellcasting feature');
    }
    if (typeof req.other === 'string') parts.push(req.other);
    return parts.join(', ');
  });
  return groups.filter(Boolean).join(locale === 'pl' ? ' lub ' : ' or ');
}

const OPTIONAL_FEATURE_TYPES: Record<string, string> = {
  EI: 'Eldritch Invocation',
  MM: 'Metamagic',
  MV: 'Maneuver',
  'MV:B': 'Maneuver',
  FS: 'Fighting Style',
  'FS:F': 'Fighting Style',
  PB: 'Pact Boon',
  AI: 'Artificer Infusion',
  RN: 'Rune',
};

export function formatOptionalFeatureType(
  types: string[] | undefined,
  locale: Locale = 'en',
): string {
  if (!types?.length) return locale === 'pl' ? 'Opcja' : 'Option';
  return [...new Set(types.map((t) => OPTIONAL_FEATURE_TYPES[t] ?? t))]
    .map((value) =>
      locale === 'pl'
        ? value
            .replace('Eldritch Invocation', 'Inwokacja nadnaturalna')
            .replace('Metamagic', 'Metamagia')
            .replace('Maneuver', 'Manewr')
            .replace('Fighting Style', 'Styl walki')
            .replace('Pact Boon', 'Dar paktu')
            .replace('Artificer Infusion', 'Infuzja artificera')
            .replace('Rune', 'Run')
        : value,
    )
    .join(', ');
}

const HAZARD_TYPES: Record<string, string> = {
  ENV: 'Environmental Hazard',
  EST: 'Eldritch Storm',
  GEN: 'Generic Hazard',
  HAZ: 'Hazard',
  MAG: 'Magical Trap',
  MECH: 'Mechanical Trap',
  WTH: 'Weather',
  WLD: 'Wilderness Hazard',
  TRP: 'Trap',
};

export function formatHazardType(
  type: string | undefined,
  fallback: string,
  locale: Locale = 'en',
): string {
  if (!type) return fallback;
  const value = HAZARD_TYPES[type] ?? fallback;
  return locale === 'pl'
    ? value
        .replace('Environmental Hazard', 'Zagrożenie środowiskowe')
        .replace('Eldritch Storm', 'Burza nadnaturalna')
        .replace('Generic Hazard', 'Ogólne zagrożenie')
        .replace('Magical Trap', 'Pułapka magiczna')
        .replace('Mechanical Trap', 'Pułapka mechaniczna')
        .replace('Wilderness Hazard', 'Zagrożenie dziczy')
        .replace('Weather', 'Pogoda')
        .replace('Hazard', 'Zagrożenie')
        .replace('Trap', 'Pułapka')
    : value;
}

export function formatDomains(domains: string[] | undefined): string {
  return domains?.length ? domains.join(', ') : '';
}

export function formatAbilityList(
  abilities: string[] | undefined,
  locale: Locale = 'en',
): string {
  if (!abilities?.length) return '';
  return abilities
    .map((ab) =>
      locale === 'pl' ? (PL_ABILITIES[ab] ?? ABILITIES[ab] ?? ab) : (ABILITIES[ab] ?? ab),
    )
    .join(', ');
}

export function formatPrimaryAbility(
  primary: Array<Record<string, boolean>> | undefined,
  locale: Locale = 'en',
): string {
  if (!primary?.length) return '';
  return primary
    .map((group) =>
      Object.entries(group)
        .filter(([, on]) => on)
        .map(([key]) =>
          locale === 'pl'
            ? (PL_ABILITIES[key] ?? ABILITIES[key] ?? key)
            : (ABILITIES[key] ?? key),
        )
        .join(locale === 'pl' ? ' i ' : ' and '),
    )
    .filter(Boolean)
    .join(locale === 'pl' ? ' lub ' : ' or ');
}

export function formatProfList(
  list: unknown[] | undefined,
  locale: Locale = 'en',
): string {
  if (!list?.length) return '';
  return list
    .map((entry) => {
      let text = '';
      if (typeof entry === 'string') text = entry;
      else if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.proficiency === 'string') text = obj.proficiency;
        else if (typeof obj.full === 'string') text = obj.full;
      }
      text = stripMarkup(text).trim();
      if (!text) return '';

      return text.includes(' ') ? capitalize(text) : titleizeProf(text, locale);
    })
    .filter(Boolean)
    .join(', ');
}

interface StartingProficiencies {
  armor?: unknown[];
  weapons?: unknown[];
  tools?: unknown[];
  skills?: Array<Record<string, unknown>>;
}

export function formatStartingProficiencies(
  sp: StartingProficiencies | undefined,
  locale: Locale = 'en',
): string {
  if (!sp) return '';
  const parts: string[] = [];
  if (sp.armor?.length)
    parts.push(
      `${locale === 'pl' ? 'Pancerz' : 'Armor'}: ${formatProfList(sp.armor, locale)}`,
    );
  if (sp.weapons?.length)
    parts.push(
      `${locale === 'pl' ? 'Broń' : 'Weapons'}: ${formatProfList(sp.weapons, locale)}`,
    );
  if (sp.tools?.length)
    parts.push(
      `${locale === 'pl' ? 'Narzędzia' : 'Tools'}: ${formatProfList(sp.tools, locale)}`,
    );
  if (sp.skills?.length)
    parts.push(
      `${locale === 'pl' ? 'Umiejętności' : 'Skills'}: ${formatProficiencies(sp.skills, locale)}`,
    );
  return parts.join(' · ');
}

const ITEM_TYPES: Record<string, string> = {
  $: 'Treasure',
  $A: 'Treasure (Art Object)',
  $C: 'Treasure (Coinage)',
  $G: 'Treasure (Gemstone)',
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  AIR: 'Vehicle (Air)',
  AT: "Artisan's Tools",
  EXP: 'Explosive',
  FD: 'Food and Drink',
  G: 'Adventuring Gear',
  GS: 'Gaming Set',
  GV: 'Generic Variant',
  HA: 'Heavy Armor',
  INS: 'Instrument',
  LA: 'Light Armor',
  M: 'Melee Weapon',
  MA: 'Medium Armor',
  MNT: 'Mount',
  OTH: 'Other',
  P: 'Potion',
  R: 'Ranged Weapon',
  RD: 'Rod',
  RG: 'Ring',
  S: 'Shield',
  SC: 'Scroll',
  SCF: 'Spellcasting Focus',
  SHP: 'Vehicle (Water)',
  SPC: 'Vehicle (Space)',
  T: 'Tool',
  TAH: 'Tack and Harness',
  TB: 'Trade Bar',
  TG: 'Trade Good',
  VEH: 'Vehicle (Land)',
  WD: 'Wand',
  W: 'Wondrous Item',
};

const PL_ITEM_TYPES: Record<string, string> = {
  $: 'Skarb',
  $A: 'Skarb (Dzieło sztuki)',
  $C: 'Skarb (Monety)',
  $G: 'Skarb (Kamień szlachetny)',
  A: 'Amunicja',
  AF: 'Amunicja (Broń palna)',
  AIR: 'Pojazd (Powietrzny)',
  AT: 'Narzędzia rzemieślnicze',
  EXP: 'Materiał wybuchowy',
  FD: 'Jedzenie i picie',
  G: 'Ekwipunek podróżny',
  GS: 'Zestaw do gier',
  GV: 'Ogólny wariant',
  HA: 'Ciężki pancerz',
  INS: 'Instrument',
  LA: 'Lekki pancerz',
  M: 'Broń biała',
  MA: 'Średni pancerz',
  MNT: 'Wierzchowiec',
  OTH: 'Inne',
  P: 'Mikstura',
  R: 'Broń dystansowa',
  RD: 'Pręt',
  RG: 'Pierścień',
  S: 'Tarcza',
  SC: 'Zwój',
  SCF: 'Skupienie czarowania',
  SHP: 'Pojazd (Wodny)',
  SPC: 'Pojazd (Kosmiczny)',
  T: 'Narzędzie',
  TAH: 'Rząd i uprząż',
  TB: 'Sztaba handlowa',
  TG: 'Towar handlowy',
  VEH: 'Pojazd (Lądowy)',
  WD: 'Różdżka',
  W: 'Cudowny przedmiot',
};

const ITEM_PROPERTIES: Record<string, string> = {
  '2H': 'Two-Handed',
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  BF: 'Burst Fire',
  F: 'Finesse',
  H: 'Heavy',
  L: 'Light',
  LD: 'Loading',
  R: 'Reach',
  RLD: 'Reload',
  S: 'Special',
  T: 'Thrown',
  V: 'Versatile',
  Vst: 'Versatile',
};

const PL_ITEM_PROPERTIES: Record<string, string> = {
  '2H': 'Dwuręczna',
  A: 'Amunicja',
  AF: 'Amunicja (Broń palna)',
  BF: 'Ogień ciągły',
  F: 'Finezja',
  H: 'Ciężka',
  L: 'Lekka',
  LD: 'Ładowanie',
  R: 'Zasięg',
  RLD: 'Przeładowanie',
  S: 'Specjalna',
  T: 'Rzucana',
  V: 'Uniwersalna',
  Vst: 'Uniwersalna',
};

const DAMAGE_TYPES: Record<string, string> = {
  B: 'bludgeoning',
  P: 'piercing',
  S: 'slashing',
  A: 'acid',
  C: 'cold',
  F: 'fire',
  O: 'force',
  L: 'lightning',
  N: 'necrotic',
  I: 'poison',
  Y: 'psychic',
  R: 'radiant',
  T: 'thunder',
};

const PL_DAMAGE_WORDS: Record<string, string> = {
  bludgeoning: 'obuchowe',
  piercing: 'kłute',
  slashing: 'sieczne',
  acid: 'kwasowe',
  cold: 'od zimna',
  fire: 'od ognia',
  force: 'od mocy',
  lightning: 'od błyskawic',
  necrotic: 'nekrotyczne',
  poison: 'od trucizny',
  psychic: 'psychiczne',
  radiant: 'promieniste',
  thunder: 'od gromu',
};

const stripSource = (code: string) => code.split('|')[0]!;

export function formatItemType(
  type: string | undefined,
  rarity: string | undefined,
  locale: Locale = 'en',
): string {
  if (type) {
    const code = stripSource(type);
    return locale === 'pl'
      ? (PL_ITEM_TYPES[code] ?? ITEM_TYPES[code] ?? code)
      : (ITEM_TYPES[code] ?? code);
  }
  if (locale === 'pl')
    return rarity && rarity !== 'none' ? 'Cudowny przedmiot' : 'Ekwipunek podróżny';
  return rarity && rarity !== 'none' ? 'Wondrous Item' : 'Adventuring Gear';
}

const PL_RARITIES: Record<string, string> = {
  common: 'Pospolity',
  uncommon: 'Niepospolity',
  rare: 'Rzadki',
  'very rare': 'Bardzo rzadki',
  legendary: 'Legendarny',
  artifact: 'Artefakt',
  varies: 'Różny',
};

export function formatRarity(rarity: string | undefined, locale: Locale = 'en'): string {
  if (!rarity || rarity === 'none' || rarity === 'unknown') return '';
  return locale === 'pl' ? (PL_RARITIES[rarity] ?? titleCase(rarity)) : titleCase(rarity);
}

export function formatAttunement(
  reqAttune: boolean | string | undefined,
  locale: Locale = 'en',
): string {
  if (reqAttune === true)
    return locale === 'pl' ? 'Wymaga dostrojenia' : 'Requires attunement';
  if (typeof reqAttune === 'string')
    return locale === 'pl'
      ? `Wymaga dostrojenia ${reqAttune}`
      : `Requires attunement ${reqAttune}`;
  return '';
}

export function formatWeight(weight: number | undefined, locale: Locale = 'en'): string {
  if (weight == null) return '';
  return locale === 'pl'
    ? `${weight} ${weight === 1 ? 'funt' : 'funtów'}`
    : `${weight} lb.`;
}

export function formatValue(value: number | undefined, locale: Locale = 'en'): string {
  if (value == null) return '';
  const gp = value / 100;
  return locale === 'pl'
    ? Number.isInteger(gp)
      ? `${gp} sz`
      : `${value} miedz.`
    : Number.isInteger(gp)
      ? `${gp} gp`
      : `${value} cp`;
}

export function formatWeaponDamage(
  dmg1: string | undefined,
  dmgType: string | undefined,
  locale: Locale = 'en',
): string {
  if (!dmg1) return '';
  const type = dmgType
    ? locale === 'pl'
      ? (PL_DAMAGE_TYPES[dmgType] ?? DAMAGE_TYPES[dmgType] ?? dmgType)
      : (DAMAGE_TYPES[dmgType] ?? dmgType)
    : '';
  return type ? `${dmg1} ${type}` : dmg1;
}

export function formatItemProperties(
  property: Array<string | { uid?: string }> | undefined,
  locale: Locale = 'en',
): string {
  if (!property?.length) return '';
  return property
    .map((p) => (typeof p === 'string' ? p : (p.uid ?? '')))
    .filter(Boolean)
    .map((code) =>
      locale === 'pl'
        ? (PL_ITEM_PROPERTIES[stripSource(code)] ??
          ITEM_PROPERTIES[stripSource(code)] ??
          stripSource(code))
        : (ITEM_PROPERTIES[stripSource(code)] ?? stripSource(code)),
    )
    .join(', ');
}

export function formatItemReferences(
  references: Array<string | { uid?: string }> | undefined,
): string[] {
  return (references ?? [])
    .map((reference) =>
      typeof reference === 'string' ? reference : (reference.uid ?? ''),
    )
    .filter(Boolean);
}

export function formatItemReferenceNames(
  references: Array<string | { uid?: string }> | undefined,
): string {
  return formatItemReferences(references)
    .map((reference) => stripSource(reference))
    .join(', ');
}

const ABILITY_ABBR: Record<string, string> = {
  str: 'Str',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  wis: 'Wis',
  cha: 'Cha',
};

const ALIGNMENTS: Record<string, string> = {
  L: 'Lawful',
  N: 'Neutral',
  C: 'Chaotic',
  G: 'Good',
  E: 'Evil',
  U: 'Unaligned',
  A: 'Any Alignment',
};

const PL_ALIGNMENTS: Record<string, string> = {
  L: 'Praworządny',
  N: 'Neutralny',
  C: 'Chaotyczny',
  G: 'Dobry',
  E: 'Zły',
  U: 'Niezestrojony',
  A: 'Dowolne nastawienie',
};

export function formatMonsterType(
  type:
    | string
    | { type?: string | { choose?: string[] }; tags?: Array<string | { tag?: string }> }
    | undefined,
  locale: Locale = 'en',
): string {
  if (!type) return '';
  if (typeof type === 'string') return localizeMonsterType(type, locale);

  const rawType = type.type;
  const base =
    typeof rawType === 'string'
      ? localizeMonsterType(rawType, locale)
      : localizeMonsterType(rawType?.choose?.[0] ?? '', locale);

  const tags = (type.tags ?? [])
    .map((t) => (typeof t === 'string' ? t : (t.tag ?? '')))
    .filter(Boolean)
    .map(titleCase);

  return tags.length ? `${base} (${tags.join(', ')})` : base;
}

export function formatAlignment(
  alignment: unknown[] | undefined,
  locale: Locale = 'en',
): string {
  if (!alignment?.length) return '';
  const tokens: string[] = [];
  for (const part of alignment) {
    if (typeof part === 'string')
      tokens.push(
        locale === 'pl' ? (PL_ALIGNMENTS[part] ?? part) : (ALIGNMENTS[part] ?? part),
      );
    else if (part && typeof part === 'object') {
      const obj = part as { special?: string; alignment?: string[] };
      if (obj.special) tokens.push(obj.special);
      else if (obj.alignment)
        tokens.push(
          ...obj.alignment.map((a) =>
            locale === 'pl' ? (PL_ALIGNMENTS[a] ?? a) : (ALIGNMENTS[a] ?? a),
          ),
        );
    }
  }
  return tokens.join(' ');
}

export function formatMonsterAc(ac: Array<number | { ac?: number }> | undefined): string {
  if (!ac?.length) return '-';
  const first = ac[0];
  if (typeof first === 'number') return `${first}`;
  return first?.ac != null ? `${first.ac}` : '-';
}

export function formatMonsterHp(
  hp: { average?: number; formula?: string; special?: string } | undefined,
): string {
  if (!hp) return '-';
  if (hp.special) return hp.special;
  if (hp.average != null)
    return hp.formula ? `${hp.average} (${hp.formula})` : `${hp.average}`;
  return '-';
}

export function formatKeyedBonuses(
  record: Record<string, unknown> | undefined,
  abbreviate = false,
  locale: Locale = 'en',
): string {
  if (!record) return '';
  return Object.entries(record)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => {
      const label = abbreviate
        ? locale === 'pl'
          ? (PL_ABILITIES[key] ?? titleCase(key))
          : (ABILITY_ABBR[key] ?? titleCase(key))
        : locale === 'pl'
          ? (PL_ABILITIES[key] ?? titleCase(key))
          : titleCase(key);
      return `${label} ${value as string}`;
    })
    .join(', ');
}

export function formatSenses(
  senses: string[] | undefined,
  passive: number | undefined,
  locale: Locale = 'en',
): string {
  const parts = [...(senses ?? [])];
  if (passive != null)
    parts.push(
      `${locale === 'pl' ? 'Percepcja pasywna' : 'Passive Perception'} ${passive}`,
    );
  return parts.join(', ');
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function crToProficiency(cr: string): number {
  const c = cr.trim();
  if (c === '0' || c.includes('/')) return 2;
  const n = Number(c);
  if (!Number.isFinite(n)) return 2;
  return Math.max(2, Math.floor((n - 1) / 4) + 2);
}

type InitiativeRaw = number | { proficiency?: number; initiative?: number } | undefined;

export function formatInitiative(
  dex: number,
  initiative: InitiativeRaw,
  pb: number,
): string {
  let bonus: number;
  if (typeof initiative === 'number') bonus = initiative;
  else if (initiative && typeof initiative.initiative === 'number')
    bonus = initiative.initiative;
  else bonus = abilityModifier(dex) + (initiative?.proficiency ?? 0) * pb;
  const sign = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  return `${sign} (${10 + bonus})`;
}

export function formatMonsterCrDisplay(
  cr: string | { cr?: string; xp?: number; xpLair?: number } | undefined,
  locale: Locale = 'en',
): string {
  if (cr == null) return '-';
  const crStr = typeof cr === 'string' ? cr : (cr.cr ?? '-');
  const pb = crToProficiency(crStr);
  const xp = typeof cr === 'object' && cr.xp != null ? cr.xp : XP_BY_CR[crStr.trim()];
  const xpLair = typeof cr === 'object' ? cr.xpLair : undefined;
  const parts: string[] = [];
  if (xp != null) {
    parts.push(
      `${locale === 'pl' ? 'PD' : 'XP'} ${xp.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US')}` +
        (xpLair != null
          ? locale === 'pl'
            ? ` lub ${xpLair.toLocaleString('pl-PL')} w leżu`
            : `, or ${xpLair.toLocaleString('en-US')} in lair`
          : ''),
    );
  }
  parts.push(`${locale === 'pl' ? 'Premia biegłości' : 'PB'} +${pb}`);
  return `${crStr} (${parts.join('; ')})`;
}

interface DamageGroup {
  resist?: string[];
  immune?: string[];
  vulnerable?: string[];
  note?: string;
  cond?: boolean;
  special?: string;
}

function localizeDamageType(value: string, locale: Locale): string {
  if (locale !== 'pl') return value;
  return PL_DAMAGE_TYPES[value] ?? PL_DAMAGE_WORDS[value.toLowerCase()] ?? value;
}

export function formatDamageTypes(
  list: Array<string | DamageGroup> | undefined,
  locale: Locale = 'en',
): string {
  if (!list?.length) return '';
  return list
    .map((entry) => {
      if (typeof entry === 'string') return localizeDamageType(entry, locale);
      if (entry.special) return entry.special;
      const inner = entry.resist ?? entry.immune ?? entry.vulnerable ?? [];
      const joined = inner
        .map((i) => (typeof i === 'string' ? localizeDamageType(i, locale) : ''))
        .filter(Boolean)
        .join(', ');
      return entry.note ? `${joined} ${entry.note}` : joined;
    })
    .filter(Boolean)
    .join('; ');
}

export function formatConditionList(
  list:
    | Array<string | { conditionImmune?: string[]; note?: string; special?: string }>
    | undefined,
  locale: Locale = 'en',
): string {
  if (!list?.length) return '';
  return list
    .map((entry) => {
      if (typeof entry === 'string') return localizeCondition(entry, locale);
      if (entry.special) return entry.special;
      const joined = (entry.conditionImmune ?? [])
        .map((condition) => localizeCondition(condition, locale))
        .join(', ');
      return entry.note ? `${joined} ${entry.note}` : joined;
    })
    .filter(Boolean)
    .join('; ');
}

const PL_CONDITIONS: Record<string, string> = {
  blinded: 'oślepiony',
  charmed: 'zauroczony',
  deafened: 'ogłuchły',
  frightened: 'przerażony',
  grappled: 'pochwycony',
  incapacitated: 'obezwładniony',
  invisible: 'niewidzialny',
  paralyzed: 'sparaliżowany',
  petrified: 'skamieniały',
  poisoned: 'zatruty',
  prone: 'leżący',
  restrained: 'unieruchomiony',
  stunned: 'ogłuszony',
  unconscious: 'nieprzytomny',
};

function localizeCondition(value: string, locale: Locale): string {
  return locale === 'pl' ? (PL_CONDITIONS[value.toLowerCase()] ?? value) : value;
}

const DAILY_LABELS: Record<string, string> = {
  '1': '1/day',
  '1e': '1/day each',
  '2': '2/day',
  '2e': '2/day each',
  '3': '3/day',
  '3e': '3/day each',
};

export function formatDailyLabel(key: string, locale: Locale = 'en'): string {
  if (locale === 'en') return DAILY_LABELS[key] ?? `${key}/day`;
  const suffix = key.endsWith('e') ? 'każdy dzień' : 'dzień';
  return `${key.replace(/e$/, '')}/${suffix}`;
}

const PL_LANGUAGES: Record<string, string> = {
  Abyssal: 'Otchłani',
  Celestial: 'Niebiański',
  Common: 'Wspólny',
  Deep: 'Głębia',
  Draconic: 'Smoczy',
  Dwarvish: 'Krasnoludzki',
  Elvish: 'Elficki',
  Giant: 'Gigantów',
  Gnomish: 'Gnomi',
  Goblin: 'Gobliński',
  Halfling: 'Niziołczy',
  Infernal: 'Piekielny',
  Orc: 'Orkowy',
  Primordial: 'Pierwotny',
  Sylvan: 'Sylvański',
  Undercommon: 'Wspólny Podmroku',
};

export function formatLanguages(
  languages: string[] | undefined,
  locale: Locale = 'en',
): string {
  return languages?.length
    ? languages
        .map((language) =>
          locale === 'pl' ? (PL_LANGUAGES[language] ?? language) : language,
        )
        .join(', ')
    : '';
}

export function formatLanguageType(
  type: string | undefined,
  locale: Locale = 'en',
): string {
  return type ? titleCase(type) : locale === 'pl' ? 'Język' : 'Language';
}

export function formatStringList(list: string[] | undefined): string {
  return list?.length ? list.map(titleCase).join(', ') : '';
}

const RECIPE_DIETS: Record<string, string> = {
  C: 'Contains meat',
  V: 'Vegetarian',
  X: 'Vegan',
};

export function formatDiet(
  diet: string | string[] | undefined,
  locale: Locale = 'en',
): string {
  if (!diet) return '';
  const codes = Array.isArray(diet) ? diet : [diet];
  return codes
    .map((d) =>
      locale === 'pl'
        ? ({ C: 'Zawiera mięso', V: 'Wegetariańskie', X: 'Wegańskie' }[d] ??
          RECIPE_DIETS[d] ??
          d)
        : (RECIPE_DIETS[d] ?? d),
    )
    .join(', ');
}

export function formatServes(
  serves: { exact?: number; min?: number; max?: number; note?: string } | undefined,
): string {
  if (!serves) return '';
  let count = '';
  if (serves.exact != null) count = `${serves.exact}`;
  else if (serves.min != null && serves.max != null)
    count = `${serves.min}-${serves.max}`;
  return [count, serves.note].filter(Boolean).join(' ');
}

const FACILITY_TYPES: Record<string, string> = {
  basic: 'Basic',
  special: 'Special',
};

const PL_FACILITY_TYPES: Record<string, string> = {
  basic: 'Podstawowa',
  special: 'Specjalna',
};

export function formatFacilityType(
  type: string | undefined,
  locale: Locale = 'en',
): string {
  return type
    ? locale === 'pl'
      ? (PL_FACILITY_TYPES[type] ?? titleCase(type))
      : (FACILITY_TYPES[type] ?? titleCase(type))
    : locale === 'pl'
      ? 'Obiekt'
      : 'Facility';
}

export function formatFacilityPrereq(
  prereq: Array<Record<string, unknown>> | undefined,
  locale: Locale = 'en',
): string {
  if (!prereq?.length) return '';
  return prereq
    .map((req) => {
      const parts: string[] = [];
      if (typeof req.level === 'number')
        parts.push(`${locale === 'pl' ? 'Poziom' : 'Level'} ${req.level}+`);
      if (Array.isArray(req.membership))
        parts.push((req.membership as string[]).join(', '));
      if (typeof req.other === 'string') parts.push(req.other);
      return parts.join(', ');
    })
    .filter(Boolean)
    .join(locale === 'pl' ? ' lub ' : ' or ');
}

const OBJECT_TYPES: Record<string, string> = {
  SW: 'Siege Weapon',
  GEN: 'Generic Object',
  U: 'Object',
};

export function formatObjectType(
  type: string | undefined,
  locale: Locale = 'en',
): string {
  const labels =
    locale === 'pl'
      ? { SW: 'Broń oblężnicza', GEN: 'Obiekt ogólny', U: 'Obiekt' }
      : OBJECT_TYPES;
  return type
    ? (labels[type as keyof typeof labels] ?? titleCase(type))
    : locale === 'pl'
      ? 'Obiekt'
      : 'Object';
}

export function formatImmunities(immune: unknown[] | undefined): string {
  if (!immune?.length) return '';
  return immune
    .map((entry) => (typeof entry === 'string' ? entry : ''))
    .filter(Boolean)
    .join(', ');
}

const VEHICLE_TYPES: Record<string, string> = {
  SHIP: 'Ship',
  SPELLJAMMER: 'Spelljammer',
  OBJECT: 'Vehicle',
  INFWAR: 'Infernal War Machine',
  CREATURE: 'Creature Vehicle',
  ELEMENTAL_AIRSHIP: 'Elemental Airship',
};

const PL_VEHICLE_TYPES: Record<string, string> = {
  SHIP: 'Statek',
  SPELLJAMMER: 'Spelljammer',
  OBJECT: 'Pojazd',
  INFWAR: 'Piekielna machina wojenna',
  CREATURE: 'Pojazd-stworzenie',
  ELEMENTAL_AIRSHIP: 'Sterowiec żywiołów',
};

export function formatVehicleType(
  type: string | undefined,
  locale: Locale = 'en',
): string {
  if (!type) return locale === 'pl' ? 'Pojazd' : 'Vehicle';
  return locale === 'pl'
    ? (PL_VEHICLE_TYPES[type] ?? titleCase(type.replace(/_/g, ' ')))
    : (VEHICLE_TYPES[type] ?? titleCase(type.replace(/_/g, ' ')));
}

export function formatDimensions(dimensions: string[] | undefined): string {
  return dimensions?.length ? dimensions.join(' × ') : '';
}

export function formatPace(
  pace: number | Record<string, number> | undefined,
  locale: Locale = 'en',
): string {
  if (pace == null) return '';
  if (typeof pace === 'number') return locale === 'pl' ? `${pace} mil/h` : `${pace} mph`;
  return Object.entries(pace)
    .map(([mode, value]) =>
      mode === 'walk'
        ? locale === 'pl'
          ? `${value} mil/h`
          : `${value} mph`
        : locale === 'pl'
          ? `${PL_SPEED_MODES[mode] ?? mode} ${value} mil/h`
          : `${mode} ${value} mph`,
    )
    .join(', ');
}

export function formatVehicleCapacity(
  crew: number | undefined,
  passenger: number | undefined,
  cargo: number | string | undefined,
  locale: Locale = 'en',
): string {
  const parts: string[] = [];
  if (crew != null) parts.push(`${locale === 'pl' ? 'Załoga' : 'Crew'} ${crew}`);
  if (passenger != null)
    parts.push(`${locale === 'pl' ? 'Pasażerowie' : 'Passengers'} ${passenger}`);
  if (cargo != null) {
    parts.push(
      `${locale === 'pl' ? 'Ładunek' : 'Cargo'} ${
        typeof cargo === 'number' ? `${cargo} ${locale === 'pl' ? 'ton' : 'tons'}` : cargo
      }`,
    );
  }
  return parts.join(', ');
}

export function formatCostGp(cost: number | undefined, locale: Locale = 'en'): string {
  return cost != null
    ? `${cost.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US')} ${locale === 'pl' ? 'sz' : 'gp'}`
    : '';
}

function titleizeProf(value: string, locale: Locale = 'en'): string {
  return locale === 'pl'
    ? (PL_ABILITIES[value] ?? titleCase(value))
    : (ABILITIES[value] ?? titleCase(value));
}

function localizeMonsterType(value: string, locale: Locale): string {
  return locale === 'pl'
    ? capitalize(PL_MONSTER_TYPES[value.toLowerCase()] ?? value)
    : titleCase(value);
}

function titleCase(value: string): string {
  value = String(value);

  return value.replace(
    /(^|\s)([a-z])/g,
    (_, pre: string, ch: string) => pre + ch.toUpperCase(),
  );
}
