import { XP_BY_CR } from '../../features/dm/xp';
import { stripMarkup } from './util';

interface TimeEntry {
  number: number;
  unit: string;
  condition?: string;
}

export function formatCastingTime(time: TimeEntry[] | undefined): string {
  if (!time?.length) return '-';
  return time
    .map((t) => {
      const unit = t.number === 1 ? t.unit : `${t.unit}s`;
      const base = `${t.number} ${unit}`;
      return t.condition ? `${base}, ${t.condition}` : base;
    })
    .join(' or ');
}

interface Range {
  type: string;
  distance?: { type: string; amount?: number };
}

export function formatRange(range: Range | undefined): string {
  if (!range) return '-';
  const dist = range.distance;
  if (!dist) return capitalize(range.type);

  switch (dist.type) {
    case 'self':
      return shapeSuffix('Self', range);
    case 'touch':
      return 'Touch';
    case 'sight':
      return 'Sight';
    case 'unlimited':
      return 'Unlimited';
    default: {
      const unit =
        dist.amount === 1
          ? dist.type === 'feet'
            ? 'foot'
            : dist.type.replace(/s$/, '')
          : dist.type;
      const measure = `${dist.amount} ${unit}`;
      return range.type === 'point' ? measure : shapeSuffix(measure, range);
    }
  }
}

function shapeSuffix(prefix: string, range: Range): string {
  const amount = range.distance?.amount;
  if (amount == null) return `${prefix} (${range.type})`;
  return `${prefix} (${amount}-foot ${range.type})`;
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

export function formatDuration(duration: Duration[] | undefined): string {
  if (!duration?.length) return '-';
  return duration
    .map((d) => {
      switch (d.type) {
        case 'instant':
          return 'Instantaneous';
        case 'permanent':
          return 'Until dispelled';
        case 'special':
          return 'Special';
        case 'timed': {
          if (!d.duration) return 'Special';
          const unit = d.duration.amount === 1 ? d.duration.type : `${d.duration.type}s`;
          const measure = `${d.duration.amount} ${unit}`;
          return d.concentration ? `Concentration, up to ${measure}` : measure;
        }
        default:
          return capitalize(d.type);
      }
    })
    .join(' or ');
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

export function formatSize(size: string[] | undefined): string {
  if (!size?.length) return '-';
  return size.map((s) => SIZES[s] ?? s).join(' or ');
}

type Speed = number | Record<string, number | boolean> | undefined;

export function formatSpeed(speed: Speed): string {
  if (speed == null) return '-';
  if (typeof speed === 'number') return `${speed} ft.`;
  const parts: string[] = [];
  for (const [mode, value] of Object.entries(speed)) {
    if (typeof value === 'number') {
      parts.push(mode === 'walk' ? `${value} ft.` : `${mode} ${value} ft.`);
    }
  }
  return parts.join(', ') || '-';
}

export function formatProficiencies(
  list: Array<Record<string, unknown>> | undefined,
): string {
  if (!list?.length) return '';
  const out: string[] = [];
  for (const group of list) {
    const fixed: string[] = [];
    for (const [key, value] of Object.entries(group)) {
      if (key === 'choose' && value && typeof value === 'object') {
        const choose = value as { from?: string[]; count?: number };
        const count = choose.count ?? 1;
        const from = (choose.from ?? []).map(titleizeProf).join(', ');
        out.push(`choose ${count} from ${from}`);
      } else if (value === true) {
        fixed.push(titleizeProf(key));
      }
    }
    if (fixed.length) out.push(fixed.join(', '));
  }
  return out.join('; ');
}

export function formatAbilityChoices(
  ability: Array<Record<string, unknown>> | undefined,
): string {
  if (!ability?.length) return '';
  const froms = new Set<string>();
  for (const entry of ability) {
    const choose = entry.choose as { from?: string[]; weighted?: { from?: string[] } };
    const from = choose?.from ?? choose?.weighted?.from ?? [];
    for (const ab of from) froms.add(ABILITIES[ab] ?? ab);
  }
  return froms.size ? `Choose from ${[...froms].join(', ')}` : '';
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
): string {
  if (!prereq?.length) return '';

  const groups = prereq.map((req) => {
    const parts: string[] = [];
    if (typeof req.level === 'number') parts.push(`Level ${req.level}+`);
    if (Array.isArray(req.ability)) {
      for (const ab of req.ability as Array<Record<string, number>>) {
        for (const [key, value] of Object.entries(ab)) {
          parts.push(`${ABILITIES[key] ?? key} ${value}+`);
        }
      }
    }

    if (Array.isArray(req.level)) {
      for (const lvl of req.level as Array<{
        level?: number;
        class?: { name?: string };
      }>) {
        const cls = lvl.class?.name ? ` ${lvl.class.name}` : '';
        parts.push(`Level ${lvl.level}+${cls}`);
      }
    }
    if (typeof req.pact === 'string') parts.push(`Pact of the ${req.pact}`);
    if (typeof req.patron === 'string') parts.push(`${req.patron} patron`);
    if (Array.isArray(req.spell)) {
      const summaries = (
        req.spell as Array<string | { entrySummary?: string; entry?: string }>
      )
        .map((s) => (typeof s === 'string' ? s : (s.entrySummary ?? s.entry ?? '')))
        .filter(Boolean);
      if (summaries.length) parts.push(summaries.join(', '));
    }
    if (req.spellcasting === true || req.spellcasting2020 === true) {
      parts.push('Spellcasting feature');
    }
    if (typeof req.other === 'string') parts.push(req.other);
    return parts.join(', ');
  });
  return groups.filter(Boolean).join(' or ');
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

export function formatOptionalFeatureType(types: string[] | undefined): string {
  if (!types?.length) return 'Option';
  return [...new Set(types.map((t) => OPTIONAL_FEATURE_TYPES[t] ?? t))].join(', ');
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

export function formatHazardType(type: string | undefined, fallback: string): string {
  if (!type) return fallback;
  return HAZARD_TYPES[type] ?? fallback;
}

export function formatDomains(domains: string[] | undefined): string {
  return domains?.length ? domains.join(', ') : '';
}

export function formatAbilityList(abilities: string[] | undefined): string {
  if (!abilities?.length) return '';
  return abilities.map((ab) => ABILITIES[ab] ?? ab).join(', ');
}

export function formatPrimaryAbility(
  primary: Array<Record<string, boolean>> | undefined,
): string {
  if (!primary?.length) return '';
  return primary
    .map((group) =>
      Object.entries(group)
        .filter(([, on]) => on)
        .map(([key]) => ABILITIES[key] ?? key)
        .join(' and '),
    )
    .filter(Boolean)
    .join(' or ');
}

export function formatProfList(list: unknown[] | undefined): string {
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

      return text.includes(' ') ? capitalize(text) : titleizeProf(text);
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
): string {
  if (!sp) return '';
  const parts: string[] = [];
  if (sp.armor?.length) parts.push(`Armor: ${formatProfList(sp.armor)}`);
  if (sp.weapons?.length) parts.push(`Weapons: ${formatProfList(sp.weapons)}`);
  if (sp.tools?.length) parts.push(`Tools: ${formatProfList(sp.tools)}`);
  if (sp.skills?.length) parts.push(`Skills: ${formatProficiencies(sp.skills)}`);
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

const stripSource = (code: string) => code.split('|')[0]!;

export function formatItemType(
  type: string | undefined,
  rarity: string | undefined,
): string {
  if (type) {
    const code = stripSource(type);
    return ITEM_TYPES[code] ?? code;
  }
  return rarity && rarity !== 'none' ? 'Wondrous Item' : 'Adventuring Gear';
}

export function formatRarity(rarity: string | undefined): string {
  if (!rarity || rarity === 'none' || rarity === 'unknown') return '';
  return titleCase(rarity);
}

export function formatAttunement(reqAttune: boolean | string | undefined): string {
  if (reqAttune === true) return 'Requires attunement';
  if (typeof reqAttune === 'string') return `Requires attunement ${reqAttune}`;
  return '';
}

export function formatWeight(weight: number | undefined): string {
  if (weight == null) return '';
  return `${weight} lb.`;
}

export function formatValue(value: number | undefined): string {
  if (value == null) return '';
  const gp = value / 100;
  return Number.isInteger(gp) ? `${gp} gp` : `${value} cp`;
}

export function formatWeaponDamage(
  dmg1: string | undefined,
  dmgType: string | undefined,
): string {
  if (!dmg1) return '';
  const type = dmgType ? (DAMAGE_TYPES[dmgType] ?? dmgType) : '';
  return type ? `${dmg1} ${type}` : dmg1;
}

export function formatItemProperties(
  property: Array<string | { uid?: string }> | undefined,
): string {
  if (!property?.length) return '';
  return property
    .map((p) => (typeof p === 'string' ? p : (p.uid ?? '')))
    .filter(Boolean)
    .map((code) => ITEM_PROPERTIES[stripSource(code)] ?? stripSource(code))
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

export function formatMonsterType(
  type:
    | string
    | { type?: string | { choose?: string[] }; tags?: Array<string | { tag?: string }> }
    | undefined,
): string {
  if (!type) return '';
  if (typeof type === 'string') return titleCase(type);

  const rawType = type.type;
  const base =
    typeof rawType === 'string'
      ? titleCase(rawType)
      : titleCase(rawType?.choose?.[0] ?? '');

  const tags = (type.tags ?? [])
    .map((t) => (typeof t === 'string' ? t : (t.tag ?? '')))
    .filter(Boolean)
    .map(titleCase);

  return tags.length ? `${base} (${tags.join(', ')})` : base;
}

export function formatAlignment(alignment: unknown[] | undefined): string {
  if (!alignment?.length) return '';
  const tokens: string[] = [];
  for (const part of alignment) {
    if (typeof part === 'string') tokens.push(ALIGNMENTS[part] ?? part);
    else if (part && typeof part === 'object') {
      const obj = part as { special?: string; alignment?: string[] };
      if (obj.special) tokens.push(obj.special);
      else if (obj.alignment)
        tokens.push(...obj.alignment.map((a) => ALIGNMENTS[a] ?? a));
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
): string {
  if (!record) return '';
  return Object.entries(record)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => {
      const label = abbreviate ? (ABILITY_ABBR[key] ?? titleCase(key)) : titleCase(key);
      return `${label} ${value as string}`;
    })
    .join(', ');
}

export function formatSenses(
  senses: string[] | undefined,
  passive: number | undefined,
): string {
  const parts = [...(senses ?? [])];
  if (passive != null) parts.push(`Passive Perception ${passive}`);
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
): string {
  if (cr == null) return '-';
  const crStr = typeof cr === 'string' ? cr : (cr.cr ?? '-');
  const pb = crToProficiency(crStr);
  const xp = typeof cr === 'object' && cr.xp != null ? cr.xp : XP_BY_CR[crStr.trim()];
  const xpLair = typeof cr === 'object' ? cr.xpLair : undefined;
  const parts: string[] = [];
  if (xp != null) {
    parts.push(
      `XP ${xp.toLocaleString('en-US')}` +
        (xpLair != null ? `, or ${xpLair.toLocaleString('en-US')} in lair` : ''),
    );
  }
  parts.push(`PB +${pb}`);
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

export function formatDamageTypes(list: Array<string | DamageGroup> | undefined): string {
  if (!list?.length) return '';
  return list
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry.special) return entry.special;
      const inner = entry.resist ?? entry.immune ?? entry.vulnerable ?? [];
      const joined = inner
        .map((i) => (typeof i === 'string' ? i : ''))
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
): string {
  if (!list?.length) return '';
  return list
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry.special) return entry.special;
      const joined = (entry.conditionImmune ?? []).join(', ');
      return entry.note ? `${joined} ${entry.note}` : joined;
    })
    .filter(Boolean)
    .join('; ');
}

const DAILY_LABELS: Record<string, string> = {
  '1': '1/day',
  '1e': '1/day each',
  '2': '2/day',
  '2e': '2/day each',
  '3': '3/day',
  '3e': '3/day each',
};

export function formatDailyLabel(key: string): string {
  return DAILY_LABELS[key] ?? `${key}/day`;
}

export function formatLanguages(languages: string[] | undefined): string {
  return languages?.length ? languages.join(', ') : '';
}

export function formatLanguageType(type: string | undefined): string {
  return type ? titleCase(type) : 'Language';
}

export function formatStringList(list: string[] | undefined): string {
  return list?.length ? list.map(titleCase).join(', ') : '';
}

const RECIPE_DIETS: Record<string, string> = {
  C: 'Contains meat',
  V: 'Vegetarian',
  X: 'Vegan',
};

export function formatDiet(diet: string | string[] | undefined): string {
  if (!diet) return '';
  const codes = Array.isArray(diet) ? diet : [diet];
  return codes.map((d) => RECIPE_DIETS[d] ?? d).join(', ');
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

export function formatFacilityType(type: string | undefined): string {
  return type ? (FACILITY_TYPES[type] ?? titleCase(type)) : 'Facility';
}

export function formatFacilityPrereq(
  prereq: Array<Record<string, unknown>> | undefined,
): string {
  if (!prereq?.length) return '';
  return prereq
    .map((req) => {
      const parts: string[] = [];
      if (typeof req.level === 'number') parts.push(`Level ${req.level}+`);
      if (Array.isArray(req.membership))
        parts.push((req.membership as string[]).join(', '));
      if (typeof req.other === 'string') parts.push(req.other);
      return parts.join(', ');
    })
    .filter(Boolean)
    .join(' or ');
}

const OBJECT_TYPES: Record<string, string> = {
  SW: 'Siege Weapon',
  GEN: 'Generic Object',
  U: 'Object',
};

export function formatObjectType(type: string | undefined): string {
  return type ? (OBJECT_TYPES[type] ?? titleCase(type)) : 'Object';
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

export function formatVehicleType(type: string | undefined): string {
  if (!type) return 'Vehicle';
  return VEHICLE_TYPES[type] ?? titleCase(type.replace(/_/g, ' '));
}

export function formatDimensions(dimensions: string[] | undefined): string {
  return dimensions?.length ? dimensions.join(' × ') : '';
}

export function formatPace(pace: number | Record<string, number> | undefined): string {
  if (pace == null) return '';
  if (typeof pace === 'number') return `${pace} mph`;
  return Object.entries(pace)
    .map(([mode, value]) => (mode === 'walk' ? `${value} mph` : `${mode} ${value} mph`))
    .join(', ');
}

export function formatVehicleCapacity(
  crew: number | undefined,
  passenger: number | undefined,
  cargo: number | string | undefined,
): string {
  const parts: string[] = [];
  if (crew != null) parts.push(`Crew ${crew}`);
  if (passenger != null) parts.push(`Passengers ${passenger}`);
  if (cargo != null) {
    parts.push(`Cargo ${typeof cargo === 'number' ? `${cargo} tons` : cargo}`);
  }
  return parts.join(', ');
}

export function formatCostGp(cost: number | undefined): string {
  return cost != null ? `${cost.toLocaleString('en-US')} gp` : '';
}

function titleizeProf(value: string): string {
  return ABILITIES[value] ?? titleCase(value);
}

function titleCase(value: string): string {
  value = String(value);

  return value.replace(
    /(^|\s)([a-z])/g,
    (_, pre: string, ch: string) => pre + ch.toUpperCase(),
  );
}
