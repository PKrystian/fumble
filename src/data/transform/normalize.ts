import type { Entry, EntryNode } from '@/data/compendium/entry';
import type {
  ActionEntry,
  BackgroundEntry,
  BoonEntry,
  CharOptionEntry,
  ClassEntry,
  ClassFeature,
  ClassSubclass,
  ClassTable,
  ConditionEntry,
  ConditionKind,
  CultBoonEntry,
  DeckEntry,
  MasteryEntry,
  TableEntry,
  DeityEntry,
  FacilityEntry,
  FeatEntry,
  GalleryImage,
  HazardEntry,
  ItemEntry,
  LanguageEntry,
  MonsterEntry,
  ObjectEntry,
  OptionalFeatureEntry,
  RecipeEntry,
  RuleEntry,
  SenseEntry,
  SkillEntry,
  SpeciesEntry,
  SpellEntry,
  StatBlockSection,
  VehicleEntry,
} from '@/data/compendium/types';
import { SPELL_SCHOOLS, proficiencyBonus, slugify, stripMarkup } from './util';
import {
  FEAT_CATEGORIES,
  RULE_TYPES,
  crToProficiency,
  formatAbilityChoices,
  formatAbilityList,
  formatPrimaryAbility,
  formatStartingProficiencies,
  formatAlignment,
  formatAttunement,
  formatCastingTime,
  formatComponents,
  formatConditionList,
  formatCostGp,
  formatDailyLabel,
  formatDamageTypes,
  formatDiet,
  formatDimensions,
  formatDomains,
  formatDuration,
  formatFacilityPrereq,
  formatFacilityType,
  formatFeatRefs,
  formatHazardType,
  formatImmunities,
  formatInitiative,
  formatItemProperties,
  formatItemType,
  formatKeyedBonuses,
  formatLanguageType,
  formatLanguages,
  formatMonsterAc,
  formatMonsterCrDisplay,
  formatMonsterHp,
  formatMonsterType,
  formatObjectType,
  formatOptionalFeatureType,
  formatPace,
  formatPrerequisite,
  formatProfList,
  formatProficiencies,
  formatRange,
  formatRarity,
  formatSenses,
  formatServes,
  formatSize,
  formatSpeed,
  formatStringList,
  formatValue,
  formatVehicleCapacity,
  formatVehicleType,
  formatWeaponDamage,
  formatWeight,
  hasConcentration,
} from './format';

export interface FluffData {
  entries: Entry[];
  images: GalleryImage[];
}

export interface LegendaryGroup {
  lairActions?: Entry[];
  regionalEffects?: Entry[];
  mythicEncounter?: Entry[];
}

const EMPTY_LEGENDARY = new Map<string, LegendaryGroup>();

const EMPTY_IMAGES = new Map<string, string>();

function imageField(
  map: Map<string, string>,
  name: string,
  source: string,
): { image?: string } {
  const path = map.get(`${name.toLowerCase()}|${source}`);
  return path ? { image: path } : {};
}

interface RawSection {
  name?: string;
  entries?: Entry[];
  headerEntries?: Entry[];
}

function toSections(sections: RawSection[] | undefined): StatBlockSection[] {
  if (!sections?.length) return [];
  return sections.map((s) => ({
    name: s.name ?? '',
    entries: s.entries ?? s.headerEntries ?? [],
  }));
}

function baseFields(raw: {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
}) {
  return {
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    srd: Boolean(raw.srd52),
  };
}

export interface RawSpell {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  level: number;
  school: string;
  time?: Parameters<typeof formatCastingTime>[0];
  range?: Parameters<typeof formatRange>[0];
  components?: Parameters<typeof formatComponents>[0];
  duration?: Parameters<typeof formatDuration>[0];
  meta?: { ritual?: boolean };
  entries: Entry[];
  entriesHigherLevel?: Entry[];
}

export function normalizeSpell(raw: RawSpell): SpellEntry {
  return {
    ...baseFields(raw),
    level: raw.level,
    school: SPELL_SCHOOLS[raw.school] ?? raw.school,
    castingTime: formatCastingTime(raw.time),
    range: formatRange(raw.range),
    components: formatComponents(raw.components),
    duration: formatDuration(raw.duration),
    concentration: hasConcentration(raw.duration),
    ritual: Boolean(raw.meta?.ritual),
    entries: raw.entries ?? [],
    ...(raw.entriesHigherLevel ? { entriesHigherLevel: raw.entriesHigherLevel } : {}),
  };
}

export interface RawCondition {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  entries: Entry[];
}

export function normalizeCondition(
  raw: RawCondition,
  kind: ConditionKind,
): ConditionEntry {
  return { ...baseFields(raw), kind, entries: raw.entries ?? [] };
}

export interface RawSpecies {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  size?: string[];
  speed?: number | Record<string, number | boolean>;
  creatureTypes?: string[];
  entries?: Entry[];
}

function extractSpeeds(speed: RawSpecies['speed']): {
  walkSpeed: number;
  flySpeed: number;
  swimSpeed: number;
  climbSpeed: number;
} {
  if (speed == null) return { walkSpeed: 30, flySpeed: 0, swimSpeed: 0, climbSpeed: 0 };
  if (typeof speed === 'number') {
    return { walkSpeed: speed, flySpeed: 0, swimSpeed: 0, climbSpeed: 0 };
  }
  const walkSpeed = typeof speed.walk === 'number' ? speed.walk : 30;

  const resolve = (value: number | boolean | undefined): number =>
    typeof value === 'number' ? value : value === true ? walkSpeed : 0;
  return {
    walkSpeed,
    flySpeed: resolve(speed.fly),
    swimSpeed: resolve(speed.swim),
    climbSpeed: resolve(speed.climb),
  };
}

export function normalizeSpecies(
  raw: RawSpecies,
  fluff: Map<string, string> = EMPTY_IMAGES,
): SpeciesEntry {
  return {
    ...baseFields(raw),
    ...imageField(fluff, raw.name, raw.source),
    size: formatSize(raw.size),
    speed: formatSpeed(raw.speed),
    ...extractSpeeds(raw.speed),
    creatureType: (raw.creatureTypes ?? ['Humanoid'])
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(', '),
    parentRace: '',
    entries: raw.entries ?? [],
  };
}

export interface RawSubrace {
  name?: string;
  source: string;
  page?: number;
  srd52?: boolean;
  raceName: string;
  entries?: Entry[];
}

export function normalizeSubrace(
  raw: RawSubrace,
  fluff: Map<string, string> = EMPTY_IMAGES,
): SpeciesEntry {
  const name = raw.name ? `${raw.raceName} (${raw.name})` : raw.raceName;
  return {
    ...baseFields({ ...raw, name }),
    ...imageField(fluff, name, raw.source),
    size: '',
    speed: '',

    ...extractSpeeds(undefined),
    creatureType: '',
    parentRace: raw.raceName,
    entries: raw.entries ?? [],
  };
}

export interface RawFeat {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  category?: string;
  prerequisite?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

export function normalizeFeat(
  raw: RawFeat,
  fluff: Map<string, string> = EMPTY_IMAGES,
): FeatEntry {
  return {
    ...baseFields(raw),
    ...imageField(fluff, raw.name, raw.source),
    category: raw.category ? (FEAT_CATEGORIES[raw.category] ?? raw.category) : 'Feat',
    prerequisite: formatPrerequisite(raw.prerequisite),
    entries: raw.entries ?? [],
  };
}

export interface RawBackground {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  ability?: Array<Record<string, unknown>>;
  feats?: Array<Record<string, unknown>>;
  skillProficiencies?: Array<Record<string, unknown>>;
  toolProficiencies?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

export function normalizeBackground(
  raw: RawBackground,
  fluff: Map<string, string> = EMPTY_IMAGES,
): BackgroundEntry {
  return {
    ...baseFields(raw),
    ...imageField(fluff, raw.name, raw.source),
    abilityScores: formatAbilityChoices(raw.ability),
    skills: formatProficiencies(raw.skillProficiencies),
    tools: formatProficiencies(raw.toolProficiencies),
    feat: formatFeatRefs(raw.feats),
    entries: raw.entries ?? [],
  };
}

export interface RawRule {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  ruleType?: string;
  entries?: Entry[];
}

export function normalizeRule(raw: RawRule): RuleEntry {
  return {
    ...baseFields(raw),
    ruleType: raw.ruleType ? (RULE_TYPES[raw.ruleType] ?? raw.ruleType) : 'Rule',
    entries: raw.entries ?? [],
  };
}

export interface RawItem {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  rarity?: string;
  reqAttune?: boolean | string;
  weight?: number;
  value?: number;
  dmg1?: string;
  dmgType?: string;
  property?: Array<string | { uid?: string }>;
  ac?: number;
  entries?: Entry[];
}

export function normalizeItem(
  raw: RawItem,
  fluff: Map<string, string> = EMPTY_IMAGES,
): ItemEntry {
  return {
    ...baseFields(raw),
    ...imageField(fluff, raw.name, raw.source),
    type: formatItemType(raw.type, raw.rarity),
    rarity: formatRarity(raw.rarity),
    attunement: formatAttunement(raw.reqAttune),
    weight: formatWeight(raw.weight),
    value: formatValue(raw.value),
    damage: formatWeaponDamage(raw.dmg1, raw.dmgType),
    ac: raw.ac != null ? `${raw.ac}` : '',
    properties: formatItemProperties(raw.property),
    entries: raw.entries ?? [],
  };
}

interface RawSpellcasting {
  name?: string;
  headerEntries?: Entry[];
  footerEntries?: Entry[];
  will?: string[];
  daily?: Record<string, string[]>;
  spells?: Record<string, { slots?: number; spells?: string[] }>;
}

export interface RawMonster {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  size?: string[];
  type?: string | { type?: string; tags?: string[] };
  alignment?: unknown[];
  ac?: Array<number | { ac?: number }>;
  initiative?: number | { proficiency?: number; initiative?: number };
  hp?: { average?: number; formula?: string; special?: string };
  speed?: number | Record<string, number | boolean>;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  save?: Record<string, unknown>;
  skill?: Record<string, unknown>;
  vulnerable?: unknown[];
  resist?: unknown[];
  immune?: unknown[];
  conditionImmune?: unknown[];
  senses?: string[];
  passive?: number;
  languages?: string[];
  cr?: string | { cr?: string; xp?: number; xpLair?: number };
  environment?: string[];
  treasure?: string[];
  trait?: RawSection[];
  action?: RawSection[];
  bonus?: RawSection[];
  reaction?: RawSection[];
  legendary?: RawSection[];
  legendaryActions?: number;
  legendaryActionsLair?: number;
  legendaryGroup?: { name: string; source: string };
  spellcasting?: RawSpellcasting[];
  hasToken?: boolean;
}

function spellcastingSections(list: RawSpellcasting[] | undefined): StatBlockSection[] {
  if (!list?.length) return [];
  return list.map((sc) => {
    const entries: Entry[] = [...(sc.headerEntries ?? [])];
    if (sc.will?.length) entries.push(`At will: ${sc.will.join(', ')}`);
    for (const [key, spells] of Object.entries(sc.daily ?? {})) {
      if (Array.isArray(spells) && spells.length) {
        entries.push(`${formatDailyLabel(key)}: ${spells.join(', ')}`);
      }
    }
    for (const [level, data] of Object.entries(sc.spells ?? {})) {
      if (data.spells?.length) {
        const label =
          level === '0'
            ? 'Cantrips (at will)'
            : `Level ${level}${data.slots ? ` (${data.slots} slots)` : ''}`;
        entries.push(`${label}: ${data.spells.join(', ')}`);
      }
    }
    if (sc.footerEntries?.length) entries.push(...sc.footerEntries);
    return { name: sc.name ?? 'Spellcasting', entries };
  });
}

export function normalizeMonster(
  raw: RawMonster,
  fluff: Map<string, string> = EMPTY_IMAGES,
  legendaryGroups: Map<string, LegendaryGroup> = EMPTY_LEGENDARY,
): MonsterEntry {
  const crStr = typeof raw.cr === 'string' ? raw.cr : (raw.cr?.cr ?? '-');
  const pb = crToProficiency(crStr);
  const fluffImage = fluff.get(`${raw.name.toLowerCase()}|${raw.source}`);
  const tokenImage = raw.hasToken
    ? `bestiary/tokens/${raw.source}/${raw.name}.webp`
    : undefined;
  const image = fluffImage ?? tokenImage;

  const legendarySections = toSections(raw.legendary);
  let legendaryIntro = '';
  if (legendarySections.length) {
    const uses = raw.legendaryActions ?? 3;
    const lair = raw.legendaryActionsLair;
    legendaryIntro =
      `Legendary Action Uses: ${uses}${lair != null ? ` (${lair} in Lair)` : ''}. ` +
      'Immediately after another creature’s turn, this creature can expend a use ' +
      'to take one of the following actions; it regains all expended uses at the start ' +
      'of each of its turns.';
  }
  const group = raw.legendaryGroup
    ? legendaryGroups.get(
        `${raw.legendaryGroup.name.toLowerCase()}|${raw.legendaryGroup.source}`,
      )
    : undefined;

  return {
    ...baseFields(raw),
    ...(image ? { image } : {}),
    ...(tokenImage ? { token: tokenImage } : {}),
    size: formatSize(raw.size),
    creatureType: formatMonsterType(raw.type),
    alignment: formatAlignment(raw.alignment),
    ac: formatMonsterAc(raw.ac),
    initiative: formatInitiative(raw.dex ?? 10, raw.initiative, pb),
    hp: formatMonsterHp(raw.hp),
    speed: formatSpeed(raw.speed),
    str: raw.str ?? 10,
    dex: raw.dex ?? 10,
    con: raw.con ?? 10,
    int: raw.int ?? 10,
    wis: raw.wis ?? 10,
    cha: raw.cha ?? 10,
    saves: formatKeyedBonuses(raw.save, true),
    skills: formatKeyedBonuses(raw.skill),
    vulnerabilities: formatDamageTypes(
      raw.vulnerable as Parameters<typeof formatDamageTypes>[0],
    ),
    resistances: formatDamageTypes(raw.resist as Parameters<typeof formatDamageTypes>[0]),
    immunities: formatDamageTypes(raw.immune as Parameters<typeof formatDamageTypes>[0]),
    conditionImmunities: formatConditionList(
      raw.conditionImmune as Parameters<typeof formatConditionList>[0],
    ),
    senses: formatSenses(raw.senses, raw.passive),
    languages: formatLanguages(raw.languages),
    cr: crStr,
    crDisplay: formatMonsterCrDisplay(raw.cr),
    habitat: formatStringList(raw.environment),
    treasure: formatStringList(raw.treasure),
    traits: toSections(raw.trait),
    spellcasting: spellcastingSections(raw.spellcasting),
    actions: toSections(raw.action),
    bonusActions: toSections(raw.bonus),
    reactions: toSections(raw.reaction),
    legendaryActions: legendarySections,
    legendaryIntro,
    lairActions: group?.lairActions ?? [],
    regionalEffects: group?.regionalEffects ?? [],
  };
}

export interface RawAction {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  time?: Parameters<typeof formatCastingTime>[0];
  entries?: Entry[];
}

export function normalizeAction(raw: RawAction): ActionEntry {
  return {
    ...baseFields(raw),
    time: raw.time ? formatCastingTime(raw.time) : '',
    entries: raw.entries ?? [],
  };
}

export interface RawOptionalFeature {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  featureType?: string[];
  prerequisite?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

export function normalizeOptionalFeature(raw: RawOptionalFeature): OptionalFeatureEntry {
  return {
    ...baseFields(raw),
    featureType: formatOptionalFeatureType(raw.featureType),
    prerequisite: formatPrerequisite(raw.prerequisite),
    entries: raw.entries ?? [],
  };
}

export interface RawDeity {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  pantheon?: string;
  alignment?: unknown[];
  domains?: string[];
  symbol?: string;
  entries?: Entry[];
}

export function normalizeDeity(raw: RawDeity): DeityEntry {
  return {
    ...baseFields(raw),
    pantheon: raw.pantheon ?? '',
    alignment: formatAlignment(raw.alignment),
    domains: formatDomains(raw.domains),
    symbol: raw.symbol ?? '',
    entries: raw.entries ?? [],
  };
}

export interface RawHazard {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  trapHazType?: string;
  entries?: Entry[];
}

export function normalizeHazard(raw: RawHazard, fallback: string): HazardEntry {
  return {
    ...baseFields(raw),
    hazardType: formatHazardType(raw.trapHazType, fallback),
    entries: raw.entries ?? [],
  };
}

export interface RawReward {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  entries?: Entry[];
}

export function normalizeBoon(raw: RawReward): BoonEntry {
  return { ...baseFields(raw), boonType: raw.type ?? 'Boon', entries: raw.entries ?? [] };
}

export interface RawSkill {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  ability?: string;
  entries?: Entry[];
}

export function normalizeSkill(raw: RawSkill): SkillEntry {
  return {
    ...baseFields(raw),
    ability: formatAbilityList(raw.ability ? [raw.ability] : []),
    entries: raw.entries ?? [],
  };
}

export interface RawSense {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  entries?: Entry[];
}

export function normalizeSense(raw: RawSense): SenseEntry {
  return { ...baseFields(raw), entries: raw.entries ?? [] };
}

export interface RawLanguage {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  script?: string;
  typicalSpeakers?: string[];
  entries?: Entry[];
}

export function normalizeLanguage(raw: RawLanguage): LanguageEntry {
  return {
    ...baseFields(raw),
    languageType: formatLanguageType(raw.type),
    script: raw.script ?? '',
    typicalSpeakers: formatStringList(raw.typicalSpeakers),
    entries: raw.entries ?? [],
  };
}

export interface RawCultBoon {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  entries?: Entry[];
}

export function normalizeCultBoon(raw: RawCultBoon, kind: string): CultBoonEntry {
  return {
    ...baseFields(raw),
    kind,
    category: raw.type ?? kind,
    entries: raw.entries ?? [],
  };
}

export interface RawFacility {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  facilityType?: string;
  level?: number;
  prerequisite?: Array<Record<string, unknown>>;
  space?: string[];
  orders?: string[];
  entries?: Entry[];
}

export function normalizeFacility(raw: RawFacility): FacilityEntry {
  return {
    ...baseFields(raw),
    facilityType: formatFacilityType(raw.facilityType),
    level: raw.level != null ? `${raw.level}` : '',
    prerequisite: formatFacilityPrereq(raw.prerequisite),
    space: formatStringList(raw.space),
    orders: formatStringList(raw.orders),
    entries: raw.entries ?? [],
  };
}

export interface RawRecipe {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  serves?: { exact?: number; min?: number; max?: number; note?: string };
  diet?: string | string[];
  ingredients?: Array<string | ({ entry?: string } & Record<string, unknown>)>;
  instructions?: Entry[];
  entries?: Entry[];
}

function resolveIngredient(
  ing: string | ({ entry?: string } & Record<string, unknown>),
): Entry {
  if (typeof ing === 'string') return ing;
  const text = ing.entry ?? '';
  return text.replace(/\{=(\w+)[^}]*\}/g, (_, key: string) => {
    const value = ing[key];
    return value == null ? '' : String(value);
  });
}

function recipeEntries(raw: RawRecipe): Entry[] {
  const out: Entry[] = [];
  if (raw.ingredients?.length) {
    out.push({
      type: 'entries',
      name: 'Ingredients',
      entries: [{ type: 'list', items: raw.ingredients.map(resolveIngredient) }],
    });
  }
  if (raw.instructions?.length) {
    out.push({
      type: 'entries',
      name: 'Instructions',
      entries: [{ type: 'list', items: raw.instructions }],
    });
  }
  if (raw.entries?.length) out.push(...raw.entries);
  return out;
}

export function normalizeRecipe(raw: RawRecipe): RecipeEntry {
  return {
    ...baseFields(raw),
    recipeType: raw.type ?? 'Recipe',
    serves: formatServes(raw.serves),
    diet: formatDiet(raw.diet),
    entries: recipeEntries(raw),
  };
}

export interface RawObject {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  size?: string[];
  objectType?: string;
  ac?: number | { ac?: number };
  hp?: number | { hp?: number; average?: number; formula?: string; special?: string };
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  immune?: unknown[];
  senses?: string[];
  passive?: number;
  actionEntries?: RawSection[];
  hasToken?: boolean;
}

export function normalizeObject(raw: RawObject): ObjectEntry {
  const ac =
    typeof raw.ac === 'number' ? `${raw.ac}` : raw.ac?.ac != null ? `${raw.ac.ac}` : '';
  const hp =
    typeof raw.hp === 'number'
      ? `${raw.hp}`
      : raw.hp != null
        ? formatMonsterHp(raw.hp)
        : '';
  const image = raw.hasToken
    ? `objects/tokens/${raw.source}/${raw.name}.webp`
    : undefined;
  return {
    ...baseFields(raw),
    ...(image ? { image } : {}),
    size: formatSize(raw.size),
    objectType: formatObjectType(raw.objectType),
    ac,
    hp,
    str: raw.str ?? 10,
    dex: raw.dex ?? 10,
    con: raw.con ?? 10,
    int: raw.int ?? 10,
    wis: raw.wis ?? 10,
    cha: raw.cha ?? 10,
    immune: formatImmunities(raw.immune),
    senses: formatSenses(raw.senses, raw.passive),
    actions: toSections(raw.actionEntries),
  };
}

interface RawWeapon {
  name?: string;
  count?: number;
  crew?: number;
  ac?: number;
  hp?: number;
  entries?: Entry[];
  action?: RawSection[];
}

export interface RawVehicle {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  vehicleType?: string;
  size?: string | string[];
  dimensions?: string[];
  terrain?: string[];
  capCrew?: number;
  capPassenger?: number;
  capCargo?: number | string;
  pace?: number | Record<string, number>;
  speed?: number | Record<string, number | boolean>;
  cost?: number;
  ac?: number | { ac?: number };
  hp?: number | { hp?: number; average?: number; formula?: string; special?: string };
  hull?: { ac?: number; hp?: number };
  immune?: unknown[];
  entries?: Entry[];
  weapon?: RawWeapon[];
  hasToken?: boolean;
}

function weaponSection(weapon: RawWeapon): StatBlockSection {
  const label = weapon.count && weapon.count > 1 ? ` (×${weapon.count})` : '';
  const statBits: string[] = [];
  if (weapon.ac != null) statBits.push(`AC ${weapon.ac}`);
  if (weapon.hp != null) statBits.push(`HP ${weapon.hp}`);
  if (weapon.crew != null) statBits.push(`Crew ${weapon.crew}`);
  const entries: Entry[] = [];
  if (statBits.length) entries.push(statBits.join(', '));
  if (weapon.entries?.length) entries.push(...weapon.entries);
  for (const action of weapon.action ?? []) {
    entries.push({
      type: 'entries',
      name: action.name ?? '',
      entries: action.entries ?? action.headerEntries ?? [],
    });
  }
  return { name: `${weapon.name ?? 'Weapon'}${label}`, entries };
}

interface RawFeatureRef {
  classFeature?: string;
  subclassFeature?: string;
}

interface RawClassFeature {
  name: string;
  source: string;
  classSource?: string;
  level: number;
  subclassShortName?: string;
  entries?: Entry[];
}

interface RawTableGroup {
  title?: string;
  colLabels?: string[];
  rows?: Array<Array<string | number | Record<string, unknown>>>;
  rowsSpellProgression?: number[][];
}

interface RawClass {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  hd?: { faces: number };
  primaryAbility?: Array<Record<string, boolean>>;
  proficiency?: string[];
  startingProficiencies?: Parameters<typeof formatStartingProficiencies>[0];
  classFeatures?: Array<string | RawFeatureRef>;
  classTableGroups?: RawTableGroup[];
  subclassTitle?: string;
}

interface RawSubclass {
  name: string;
  source: string;
  shortName?: string;
  className?: string;
  subclassFeatures?: Array<string | RawFeatureRef>;
}

export interface RawClassFile {
  class?: RawClass[];
  subclass?: RawSubclass[];
  classFeature?: RawClassFeature[];
  subclassFeature?: RawClassFeature[];
}

const CLASS_TABLE_ROWS = 20;

function cellToString(
  cell: string | number | Record<string, unknown> | undefined,
): string {
  if (cell == null) return '-';
  if (typeof cell === 'number') return `${cell}`;
  if (typeof cell === 'string') return stripMarkup(cell) || '-';
  const obj = cell as { entry?: string; value?: number };
  if (typeof obj.entry === 'string') return stripMarkup(obj.entry);
  if (typeof obj.value === 'number') return `${obj.value}`;
  return '-';
}

function slotCount(value: unknown): string {
  return typeof value === 'number' && value > 0 ? `${value}` : '-';
}

function buildClassTable(raw: RawClass, features: ClassFeature[]): ClassTable {
  const headers = ['Level', 'Prof. Bonus', 'Features'];
  const groups = raw.classTableGroups ?? [];
  for (const group of groups) {
    for (const label of group.colLabels ?? []) headers.push(stripMarkup(label));
  }
  const rows: string[][] = [];
  for (let level = 1; level <= CLASS_TABLE_ROWS; level += 1) {
    const featureNames = features
      .filter((f) => f.level === level)
      .map((f) => f.name)
      .join(', ');
    const row = [`${level}`, proficiencyBonus(level), featureNames || '-'];
    for (const group of groups) {
      const labelCount = (group.colLabels ?? []).length;
      const source = group.rowsSpellProgression ?? group.rows ?? [];
      const cells = source[level - 1] ?? [];
      for (let col = 0; col < labelCount; col += 1) {
        row.push(
          group.rowsSpellProgression ? slotCount(cells[col]) : cellToString(cells[col]),
        );
      }
    }
    rows.push(row);
  }
  return { headers, rows };
}

function parseFeatureRef(ref: string | RawFeatureRef): {
  name: string;
  level: number;
  source: string;
} {
  const raw =
    typeof ref === 'string' ? ref : (ref.classFeature ?? ref.subclassFeature ?? '');
  const parts = raw.split('|');
  const name = parts[0]!;
  const source = parts[2] ?? '';
  let level = 0;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const n = Number(parts[i]);
    if (parts[i] !== '' && Number.isInteger(n)) {
      level = n;
      break;
    }
  }
  return { name, level, source };
}

function indexFeatures(
  features: RawClassFeature[],
  bySubclass = false,
): Map<string, RawClassFeature> {
  const index = new Map<string, RawClassFeature>();
  for (const feature of features) {
    const src = (feature.classSource ?? feature.source ?? '').toLowerCase();
    const nm = feature.name.toLowerCase();
    const sc = (feature.subclassShortName ?? '').toLowerCase();
    const strict = bySubclass
      ? `${src}|${nm}|${sc}|${feature.level}`
      : `${src}|${nm}|${feature.level}`;
    const loose = bySubclass
      ? `*|${nm}|${sc}|${feature.level}`
      : `*|${nm}|${feature.level}`;
    index.set(strict, feature);
    if (!index.has(loose)) index.set(loose, feature);
  }
  return index;
}

function lookupClassFeature(
  index: Map<string, RawClassFeature>,
  ref: string,
): RawClassFeature | undefined {
  const { name, level, source } = parseFeatureRef(ref);
  const nm = name.toLowerCase();
  return (
    index.get(`${source.toLowerCase()}|${nm}|${level}`) ?? index.get(`*|${nm}|${level}`)
  );
}

function lookupSubFeature(
  index: Map<string, RawClassFeature>,
  ref: string,
): RawClassFeature | undefined {
  const { name, level, source } = parseFeatureRef(ref);
  const shortName = (ref.split('|')[3] ?? '').toLowerCase();
  const nm = name.toLowerCase();
  return (
    index.get(`${source.toLowerCase()}|${nm}|${shortName}|${level}`) ??
    index.get(`*|${nm}|${shortName}|${level}`)
  );
}

function expandFeatureRefs(
  entries: Entry[] | undefined,
  classIndex: Map<string, RawClassFeature>,
  subIndex: Map<string, RawClassFeature>,
  depth = 0,
): Entry[] {
  if (!entries || depth > 4) return entries ?? [];
  const out: Entry[] = [];
  for (const entry of entries) {
    if (typeof entry === 'string' || !entry) {
      out.push(entry);
      continue;
    }
    const node = entry as EntryNode & { classFeature?: string; subclassFeature?: string };
    if (node.type === 'refClassFeature' && typeof node.classFeature === 'string') {
      const found = lookupClassFeature(classIndex, node.classFeature);
      if (found) {
        out.push({
          type: 'entries',
          name: found.name,
          entries: expandFeatureRefs(found.entries, classIndex, subIndex, depth + 1),
        });
      }
      continue;
    }
    if (node.type === 'refSubclassFeature' && typeof node.subclassFeature === 'string') {
      const found = lookupSubFeature(subIndex, node.subclassFeature);
      if (found) {
        out.push({
          type: 'entries',
          name: found.name,
          entries: expandFeatureRefs(found.entries, classIndex, subIndex, depth + 1),
        });
      }
      continue;
    }
    if (Array.isArray(node.entries)) {
      out.push({
        ...node,
        entries: expandFeatureRefs(node.entries, classIndex, subIndex, depth + 1),
      });
      continue;
    }
    out.push(entry);
  }
  return out;
}

function resolveFeatures(
  refs: Array<string | RawFeatureRef>,
  index: Map<string, RawClassFeature>,
  classIndex: Map<string, RawClassFeature>,
  subIndex: Map<string, RawClassFeature>,
  defaultSource: string,
  subclassShortName?: string,
): ClassFeature[] {
  const out: ClassFeature[] = [];
  for (const ref of refs) {
    const { name, level, source } = parseFeatureRef(ref);
    const src = (source || defaultSource).toLowerCase();
    const nm = name.toLowerCase();
    const sc = (subclassShortName ?? '').toLowerCase();
    const strict = subclassShortName
      ? `${src}|${nm}|${sc}|${level}`
      : `${src}|${nm}|${level}`;
    const loose = subclassShortName ? `*|${nm}|${sc}|${level}` : `*|${nm}|${level}`;
    const found = index.get(strict) ?? index.get(loose);
    if (found) {
      out.push({
        level,
        name: found.name,
        entries: expandFeatureRefs(found.entries, classIndex, subIndex),
      });
    }
  }
  return out;
}

type KeepFn = (x: { source: string; _copy?: unknown }) => boolean;

function buildSubclasses(
  subclassData: RawSubclass[],
  featureIndex: Map<string, RawClassFeature>,
  subFeatureIndex: Map<string, RawClassFeature>,
  className: string,
  keep: KeepFn,
): ClassSubclass[] {
  const byKey = new Map<string, RawSubclass>();
  for (const sub of subclassData) {
    if (!keep(sub) || (sub.className && sub.className !== className)) continue;
    const key = `${sub.name}|${sub.source}`;
    if (!byKey.has(key)) byKey.set(key, sub);
  }
  return [...byKey.values()]
    .map<ClassSubclass>((sub) => ({
      name: sub.name,
      source: sub.source,
      features: resolveFeatures(
        sub.subclassFeatures ?? [],
        subFeatureIndex,
        featureIndex,
        subFeatureIndex,
        sub.source,
        sub.shortName,
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
}

export function normalizeClasses(
  data: RawClassFile,
  fluff: Map<string, string> = EMPTY_IMAGES,
  keep: KeepFn = () => true,
): ClassEntry[] {
  const featureIndex = indexFeatures(data.classFeature ?? []);
  const subFeatureIndex = indexFeatures(data.subclassFeature ?? [], true);
  const classes: ClassEntry[] = [];

  for (const raw of data.class ?? []) {
    if (!keep(raw)) continue;
    const features = resolveFeatures(
      raw.classFeatures ?? [],
      featureIndex,
      featureIndex,
      subFeatureIndex,
      raw.source,
    );

    const subclasses = buildSubclasses(
      data.subclass ?? [],
      featureIndex,
      subFeatureIndex,
      raw.name,
      keep,
    );

    classes.push({
      ...baseFields(raw),
      ...imageField(fluff, raw.name, raw.source),
      hitDie: raw.hd ? `d${raw.hd.faces}` : '-',
      primaryAbility: formatPrimaryAbility(raw.primaryAbility),
      savingThrows: formatAbilityList(raw.proficiency),
      proficiencies: formatStartingProficiencies(raw.startingProficiencies),

      armorProficiencies: formatProfList(raw.startingProficiencies?.armor),
      weaponProficiencies: formatProfList(raw.startingProficiencies?.weapons),
      toolProficiencies: formatProfList(raw.startingProficiencies?.tools),
      subclassTitle: raw.subclassTitle ?? 'Subclass',
      table: buildClassTable(raw, features),
      features,
      subclasses,
    });
  }
  return classes.sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeStandaloneSubclasses(
  data: RawClassFile,
  keep: KeepFn = () => true,
): Array<{ className: string; subclass: ClassSubclass }> {
  const featureIndex = indexFeatures(data.classFeature ?? []);
  const subFeatureIndex = indexFeatures(data.subclassFeature ?? [], true);

  const byClassName = new Map<string, RawSubclass[]>();
  for (const sub of data.subclass ?? []) {
    if (!sub.className) continue;
    const list = byClassName.get(sub.className) ?? [];
    list.push(sub);
    byClassName.set(sub.className, list);
  }

  const result: Array<{ className: string; subclass: ClassSubclass }> = [];
  for (const [className, subclassData] of byClassName) {
    for (const subclass of buildSubclasses(
      subclassData,
      featureIndex,
      subFeatureIndex,
      className,
      keep,
    )) {
      result.push({ className, subclass });
    }
  }
  return result;
}

export interface RawMastery {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  entries?: Entry[];
}

export function normalizeMastery(raw: RawMastery): MasteryEntry {
  return { ...baseFields(raw), entries: raw.entries ?? [] };
}

const CHAR_OPTION_TYPES: Record<string, string> = {
  RF: 'Race Feature',
  'RF:B': 'Background Race Feature',
  CS: 'Character Secret',
  OF: 'Optional Feature',
  SG: 'Supernatural Gift',
  DG: 'Divine Gift',
  DB: 'Dark Bargain',
};

export interface RawCharOption {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  optionType?: string[];
  prerequisite?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

export function normalizeCharOption(raw: RawCharOption): CharOptionEntry {
  return {
    ...baseFields(raw),
    optionType:
      (raw.optionType ?? []).map((t) => CHAR_OPTION_TYPES[t] ?? t).join(', ') ||
      'Character Option',
    prerequisite: formatPrerequisite(raw.prerequisite),
    entries: raw.entries ?? [],
  };
}

export interface RawTable {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  caption?: string;
  colLabels?: string[];
  rows?: Entry[][];
}

export function normalizeTable(raw: RawTable): TableEntry {
  return {
    ...baseFields(raw),
    caption: raw.caption ?? raw.name,
    colLabels: raw.colLabels ?? [],
    rows: raw.rows ?? [],
  };
}

export interface RawDeck {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  cards?: Array<{ uid?: string; count?: number }>;
  entries?: Entry[];
}

export function normalizeDeck(raw: RawDeck): DeckEntry {
  const cardCount = (raw.cards ?? []).reduce((sum, c) => sum + (c.count ?? 1), 0);
  return { ...baseFields(raw), cardCount, entries: raw.entries ?? [] };
}

export function normalizeVehicle(
  raw: RawVehicle,
  fluff: Map<string, string> = EMPTY_IMAGES,
): VehicleEntry {
  const size = Array.isArray(raw.size) ? raw.size : raw.size ? [raw.size] : undefined;
  const acValue = raw.hull?.ac ?? (typeof raw.ac === 'number' ? raw.ac : raw.ac?.ac);
  const hpValue =
    raw.hull?.hp ??
    (typeof raw.hp === 'number' ? raw.hp : (raw.hp?.hp ?? raw.hp?.average));
  const fluffImage = fluff.get(`${raw.name.toLowerCase()}|${raw.source}`);
  const image =
    fluffImage ??
    (raw.hasToken ? `vehicles/tokens/${raw.source}/${raw.name}.webp` : undefined);
  return {
    ...baseFields(raw),
    ...(image ? { image } : {}),
    vehicleType: formatVehicleType(raw.vehicleType),
    size: size ? formatSize(size) : '',
    dimensions: formatDimensions(raw.dimensions),
    terrain: formatStringList(raw.terrain),
    capacity: formatVehicleCapacity(raw.capCrew, raw.capPassenger, raw.capCargo),
    pace: formatPace(raw.pace),
    speed: formatSpeed(raw.speed),
    cost: formatCostGp(raw.cost),
    ac: acValue != null ? `${acValue}` : '',
    hp: hpValue != null ? `${hpValue}` : '',
    immune: formatImmunities(raw.immune),
    entries: raw.entries ?? [],
    weapons: (raw.weapon ?? []).map(weaponSection),
  };
}
