import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry } from '../../src/data/compendium/entry';
import type {
  ActionEntry,
  BackgroundEntry,
  BookContentsEntry,
  BookIndexEntry,
  BoonEntry,
  CharOptionEntry,
  ClassEntry,
  CompendiumFile,
  ConditionEntry,
  ConditionKind,
  CultBoonEntry,
  DeckEntry,
  DeityEntry,
  FacilityEntry,
  FeatEntry,
  HazardEntry,
  ItemEntry,
  LanguageEntry,
  MasteryEntry,
  MonsterEntry,
  ObjectEntry,
  OptionalFeatureEntry,
  RecipeEntry,
  TableEntry,
  RuleEntry,
  SenseEntry,
  SkillEntry,
  SpeciesEntry,
  SpellEntry,
  StatBlockSection,
  VehicleEntry,
} from '../../src/data/compendium/types';
import {
  FEAT_CATEGORIES,
  RULE_TYPES,
  formatAbilityChoices,
  formatAbilityList,
  formatAttunement,
  formatCastingTime,
  formatComponents,
  formatDuration,
  formatAlignment,
  formatCostGp,
  formatDiet,
  formatDimensions,
  formatDomains,
  formatFacilityPrereq,
  formatFacilityType,
  formatFeatRefs,
  formatHazardType,
  formatImmunities,
  formatPace,
  formatVehicleCapacity,
  formatVehicleType,
  formatItemProperties,
  formatItemType,
  formatLanguageType,
  formatMonsterHp,
  formatObjectType,
  formatOptionalFeatureType,
  formatPrerequisite,
  formatSenses,
  formatServes,
  formatStringList,
  formatProficiencies,
  formatRange,
  formatRarity,
  formatSize,
  formatSpeed,
  formatValue,
  formatWeaponDamage,
  formatWeight,
  hasConcentration,
} from '../../src/data/transform/format';
import {
  type FluffData,
  SOURCE_REPO,
  SPELL_SCHOOLS,
  fluffFilesIn,
  keepEntry,
  loadCoreSupplementSources,
  loadAllFluffImages,
  loadFluff,
  loadFluffImages,
  loadLegendaryGroups,
  loadSourceNames,
  loadSourceRanks,
  readDataFile,
  readSourceCommit,
  resolveInputDir,
  setAllowedSources,
  setSourceRanks,
  slugify,
  sourceRank,
} from './shared';
import {
  type RawCharOption,
  type RawClassFile,
  type RawDeck,
  type RawMastery,
  type RawMonster,
  type RawSpecies,
  type RawSubrace,
  type RawTable,
  normalizeCharOption,
  normalizeClasses,
  normalizeDeck,
  normalizeMastery,
  normalizeMonster,
  normalizeSpecies,
  normalizeSubrace,
  normalizeTable,
} from '../../src/data/transform/normalize';

function attachFluff<
  T extends {
    name: string;
    source: string;
    image?: string;
    lore?: Entry[];
    gallery?: FluffData['images'];
  },
>(items: T[], fluff: Map<string, FluffData>): T[] {
  for (const item of items) {
    const fd = fluff.get(`${item.name.toLowerCase()}|${item.source}`);
    if (!fd) continue;
    if (fd.entries.length) item.lore = fd.entries;
    if (fd.images.length) {
      item.gallery = fd.images;

      item.image = fd.images[0]!.path;
    }
  }
  return items;
}

const OUTPUT_DIR = 'src/data/generated';

function imageField(
  map: Map<string, string>,
  name: string,
  source: string,
): { image?: string } {
  const path = map.get(`${name.toLowerCase()}|${source}`);
  return path ? { image: path } : {};
}

interface RawSpell {
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

function transformSpell(raw: RawSpell): SpellEntry {
  return {
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    srd: Boolean(raw.srd52),
    level: raw.level,
    school: SPELL_SCHOOLS[raw.school] ?? raw.school,
    castingTime: formatCastingTime(raw.time),
    range: formatRange(raw.range),
    components: formatComponents(raw.components),
    duration: formatDuration(raw.duration),
    concentration: hasConcentration(raw.duration),
    ritual: Boolean(raw.meta?.ritual),
    entries: raw.entries,
    ...(raw.entriesHigherLevel ? { entriesHigherLevel: raw.entriesHigherLevel } : {}),
  };
}

function buildSpells(inputDir: string): SpellEntry[] {
  const spellsDir = join(inputDir, 'data', 'spells');
  const files = readdirSync(spellsDir).filter(
    (f) => f.startsWith('spells-') && f.endsWith('.json'),
  );
  const spells: SpellEntry[] = [];
  for (const file of files) {
    const data = readDataFile<{ spell?: RawSpell[] }>(inputDir, join('spells', file));
    for (const raw of data.spell ?? []) {
      if (keepEntry(raw)) spells.push(transformSpell(raw));
    }
  }
  return spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

interface RawCondition {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  entries: Entry[];
}

function buildConditions(inputDir: string): ConditionEntry[] {
  const data = readDataFile<Record<ConditionKind, RawCondition[]>>(
    inputDir,
    'conditionsdiseases.json',
  );
  const kinds: ConditionKind[] = ['condition', 'disease', 'status'];
  const out: ConditionEntry[] = [];
  for (const kind of kinds) {
    for (const raw of data[kind] ?? []) {
      if (!keepEntry(raw)) continue;
      out.push({
        id: slugify(raw.name),
        name: raw.name,
        source: raw.source,
        ...(raw.page != null ? { page: raw.page } : {}),
        srd: Boolean(raw.srd52),
        kind,
        entries: raw.entries,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function buildSpecies(inputDir: string): SpeciesEntry[] {
  const data = readDataFile<{ race?: RawSpecies[]; subrace?: RawSubrace[] }>(
    inputDir,
    'races.json',
  );
  const fluff = loadFluffImages(inputDir, 'fluff-races.json', 'raceFluff');
  const races = (data.race ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeSpecies(raw, fluff));
  const subraces = (data.subrace ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeSubrace(raw, fluff));
  return [...races, ...subraces].sort((a, b) => a.name.localeCompare(b.name));
}

interface RawFeat {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  category?: string;
  prerequisite?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

function buildFeats(inputDir: string): FeatEntry[] {
  const data = readDataFile<{ feat?: RawFeat[] }>(inputDir, 'feats.json');
  const fluff = loadFluffImages(inputDir, 'fluff-feats.json', 'featFluff');
  return (data.feat ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      ...imageField(fluff, raw.name, raw.source),
      srd: Boolean(raw.srd52),
      category: raw.category ? (FEAT_CATEGORIES[raw.category] ?? raw.category) : 'Feat',
      prerequisite: formatPrerequisite(raw.prerequisite),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawBackground {
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

function buildBackgrounds(inputDir: string): BackgroundEntry[] {
  const data = readDataFile<{ background?: RawBackground[] }>(
    inputDir,
    'backgrounds.json',
  );
  const fluff = loadFluffImages(inputDir, 'fluff-backgrounds.json', 'backgroundFluff');
  return (data.background ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      ...imageField(fluff, raw.name, raw.source),
      srd: Boolean(raw.srd52),
      abilityScores: formatAbilityChoices(raw.ability),
      skills: formatProficiencies(raw.skillProficiencies),
      tools: formatProficiencies(raw.toolProficiencies),
      feat: formatFeatRefs(raw.feats),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawRule {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  ruleType?: string;
  entries?: Entry[];
}

function buildRules(inputDir: string): RuleEntry[] {
  const data = readDataFile<{ variantrule?: RawRule[] }>(inputDir, 'variantrules.json');
  return (data.variantrule ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      ruleType: raw.ruleType ? (RULE_TYPES[raw.ruleType] ?? raw.ruleType) : 'Rule',
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawItem {
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
  weaponCategory?: 'simple' | 'martial';
  entries?: Entry[];
}

function normalizeItem(raw: RawItem): ItemEntry {
  return {
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    srd: Boolean(raw.srd52),
    type: formatItemType(raw.type, raw.rarity),
    rarity: formatRarity(raw.rarity),
    attunement: formatAttunement(raw.reqAttune),
    weight: formatWeight(raw.weight),
    value: formatValue(raw.value),
    damage: formatWeaponDamage(raw.dmg1, raw.dmgType),
    ac: raw.ac != null ? `${raw.ac}` : '',
    properties: formatItemProperties(raw.property),
    ...(raw.weaponCategory ? { weaponCategory: raw.weaponCategory } : {}),
    entries: raw.entries ?? [],
  };
}

function buildItems(inputDir: string): ItemEntry[] {
  const base =
    readDataFile<{ baseitem?: RawItem[] }>(inputDir, 'items-base.json').baseitem ?? [];
  const magic = readDataFile<{ item?: RawItem[] }>(inputDir, 'items.json').item ?? [];
  const fluff = loadFluffImages(inputDir, 'fluff-items.json', 'itemFluff');
  return [...base, ...magic]
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({ ...normalizeItem(raw), ...imageField(fluff, raw.name, raw.source) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildClasses(inputDir: string): ClassEntry[] {
  const classDir = join(inputDir, 'data', 'class');
  const files = readdirSync(classDir).filter(
    (f) => f.startsWith('class-') && f.endsWith('.json'),
  );
  const classes: ClassEntry[] = [];
  for (const file of files) {
    const data = readDataFile<RawClassFile>(inputDir, join('class', file));
    const fluff = loadFluffImages(inputDir, join('class', `fluff-${file}`), 'classFluff');
    classes.push(...normalizeClasses(data, fluff, keepEntry));
  }

  const resolvedFluff = loadFluff(
    inputDir,
    fluffFilesIn(inputDir, 'class', 'fluff-class-'),
    'classFluff',
  );
  attachFluff(classes, resolvedFluff);
  return classes.sort((a, b) => a.name.localeCompare(b.name));
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

function buildMonsters(inputDir: string): MonsterEntry[] {
  const bestiaryDir = join(inputDir, 'data', 'bestiary');
  const files = readdirSync(bestiaryDir).filter(
    (f) => f.startsWith('bestiary-') && f.endsWith('.json'),
  );
  const fluffImages = loadAllFluffImages(
    inputDir,
    'bestiary',
    'fluff-bestiary-',
    'monsterFluff',
  );
  const legendary = loadLegendaryGroups(inputDir);
  const monsters: MonsterEntry[] = [];
  for (const file of files) {
    const data = readDataFile<{ monster?: RawMonster[] }>(
      inputDir,
      join('bestiary', file),
    );
    for (const raw of data.monster ?? []) {
      if (keepEntry(raw)) monsters.push(normalizeMonster(raw, fluffImages, legendary));
    }
  }
  const fluff = loadFluff(
    inputDir,
    fluffFilesIn(inputDir, 'bestiary', 'fluff-bestiary-'),
    'monsterFluff',
  );
  attachFluff(monsters, fluff);
  return monsters.sort((a, b) => a.name.localeCompare(b.name));
}

interface RawAction {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  time?: Parameters<typeof formatCastingTime>[0];
  entries?: Entry[];
}

function buildActions(inputDir: string): ActionEntry[] {
  const data = readDataFile<{ action?: RawAction[] }>(inputDir, 'actions.json');
  return (data.action ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      time: raw.time ? formatCastingTime(raw.time) : '',
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawOptionalFeature {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  featureType?: string[];
  prerequisite?: Array<Record<string, unknown>>;
  entries?: Entry[];
}

function buildOptionalFeatures(inputDir: string): OptionalFeatureEntry[] {
  const data = readDataFile<{ optionalfeature?: RawOptionalFeature[] }>(
    inputDir,
    'optionalfeatures.json',
  );
  return (data.optionalfeature ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      featureType: formatOptionalFeatureType(raw.featureType),
      prerequisite: formatPrerequisite(raw.prerequisite),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawDeity {
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

function buildDeities(inputDir: string): DeityEntry[] {
  const data = readDataFile<{ deity?: RawDeity[] }>(inputDir, 'deities.json');
  return (data.deity ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      pantheon: raw.pantheon ?? '',
      alignment: formatAlignment(raw.alignment),
      domains: formatDomains(raw.domains),
      symbol: raw.symbol ?? '',
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawHazard {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  trapHazType?: string;
  entries?: Entry[];
}

function buildHazards(inputDir: string): HazardEntry[] {
  const data = readDataFile<{ trap?: RawHazard[]; hazard?: RawHazard[] }>(
    inputDir,
    'trapshazards.json',
  );
  const normalize = (raw: RawHazard, fallback: string): HazardEntry => ({
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    srd: Boolean(raw.srd52),
    hazardType: formatHazardType(raw.trapHazType, fallback),
    entries: raw.entries ?? [],
  });
  return [
    ...(data.trap ?? []).filter((r) => keepEntry(r)).map((r) => normalize(r, 'Trap')),
    ...(data.hazard ?? []).filter((r) => keepEntry(r)).map((r) => normalize(r, 'Hazard')),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

interface RawReward {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  entries?: Entry[];
}

function buildBoons(inputDir: string): BoonEntry[] {
  const data = readDataFile<{ reward?: RawReward[] }>(inputDir, 'rewards.json');
  return (data.reward ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      boonType: raw.type ?? 'Boon',
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawSkill {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  ability?: string;
  entries?: Entry[];
}

function buildSkills(inputDir: string): SkillEntry[] {
  const data = readDataFile<{ skill?: RawSkill[] }>(inputDir, 'skills.json');
  return (data.skill ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      ability: formatAbilityList(raw.ability ? [raw.ability] : []),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawSense {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  entries?: Entry[];
}

function buildSenses(inputDir: string): SenseEntry[] {
  const data = readDataFile<{ sense?: RawSense[] }>(inputDir, 'senses.json');
  return (data.sense ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawLanguage {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  script?: string;
  typicalSpeakers?: string[];
  entries?: Entry[];
}

function buildLanguages(inputDir: string): LanguageEntry[] {
  const data = readDataFile<{ language?: RawLanguage[] }>(inputDir, 'languages.json');
  return (data.language ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      languageType: formatLanguageType(raw.type),
      script: raw.script ?? '',
      typicalSpeakers: formatStringList(raw.typicalSpeakers),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawCultBoon {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  type?: string;
  entries?: Entry[];
}

function buildCultsBoons(inputDir: string): CultBoonEntry[] {
  const data = readDataFile<{ cult?: RawCultBoon[]; boon?: RawCultBoon[] }>(
    inputDir,
    'cultsboons.json',
  );
  const make = (raw: RawCultBoon, kind: string): CultBoonEntry => ({
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    srd: Boolean(raw.srd52),
    kind,
    category: raw.type ?? kind,
    entries: raw.entries ?? [],
  });
  return [
    ...(data.cult ?? []).filter((r) => keepEntry(r)).map((r) => make(r, 'Cult')),
    ...(data.boon ?? []).filter((r) => keepEntry(r)).map((r) => make(r, 'Boon')),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

interface RawFacility {
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

function buildFacilities(inputDir: string): FacilityEntry[] {
  const data = readDataFile<{ facility?: RawFacility[] }>(inputDir, 'bastions.json');
  return (data.facility ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      facilityType: formatFacilityType(raw.facilityType),
      level: raw.level != null ? `${raw.level}` : '',
      prerequisite: formatFacilityPrereq(raw.prerequisite),
      space: formatStringList(raw.space),
      orders: formatStringList(raw.orders),
      entries: raw.entries ?? [],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawRecipe {
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

function buildRecipes(inputDir: string): RecipeEntry[] {
  const data = readDataFile<{ recipe?: RawRecipe[] }>(inputDir, 'recipes.json');
  return (data.recipe ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => ({
      id: slugify(raw.name),
      name: raw.name,
      source: raw.source,
      ...(raw.page != null ? { page: raw.page } : {}),
      srd: Boolean(raw.srd52),
      recipeType: raw.type ?? 'Recipe',
      serves: formatServes(raw.serves),
      diet: formatDiet(raw.diet),
      entries: recipeEntries(raw),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface RawObject {
  name: string;
  source: string;
  page?: number;
  srd52?: boolean;
  size?: string[];
  objectType?: string;
  ac?: number | { ac?: number };
  hp?: number | { average?: number; formula?: string; special?: string };
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

function buildObjects(inputDir: string): ObjectEntry[] {
  const data = readDataFile<{ object?: RawObject[] }>(inputDir, 'objects.json');
  return (data.object ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => {
      const ac =
        typeof raw.ac === 'number'
          ? `${raw.ac}`
          : raw.ac?.ac != null
            ? `${raw.ac.ac}`
            : '';
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
        id: slugify(raw.name),
        name: raw.name,
        source: raw.source,
        ...(raw.page != null ? { page: raw.page } : {}),
        ...(image ? { image, token: image } : {}),
        srd: Boolean(raw.srd52),
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
    })
    .sort((a, b) => a.name.localeCompare(b.name));
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

interface RawVehicle {
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

function normalizeVehicle(raw: RawVehicle, fluff: Map<string, string>): VehicleEntry {
  const size = Array.isArray(raw.size) ? raw.size : raw.size ? [raw.size] : undefined;
  const acValue = raw.hull?.ac ?? (typeof raw.ac === 'number' ? raw.ac : raw.ac?.ac);
  const hpValue =
    raw.hull?.hp ??
    (typeof raw.hp === 'number' ? raw.hp : (raw.hp?.hp ?? raw.hp?.average));
  const fluffImage = fluff.get(`${raw.name.toLowerCase()}|${raw.source}`);
  const tokenImage = raw.hasToken
    ? `vehicles/tokens/${raw.source}/${raw.name}.webp`
    : undefined;
  const image = fluffImage ?? tokenImage;
  return {
    id: slugify(raw.name),
    name: raw.name,
    source: raw.source,
    ...(raw.page != null ? { page: raw.page } : {}),
    ...(image ? { image } : {}),
    ...(tokenImage ? { token: tokenImage } : {}),
    srd: Boolean(raw.srd52),
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

function buildVehicles(inputDir: string): VehicleEntry[] {
  const data = readDataFile<{ vehicle?: RawVehicle[] }>(inputDir, 'vehicles.json');
  const fluff = loadFluffImages(inputDir, 'fluff-vehicles.json', 'vehicleFluff');
  return (data.vehicle ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeVehicle(raw, fluff))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildMasteries(inputDir: string): MasteryEntry[] {
  const data = readDataFile<{ itemMastery?: RawMastery[] }>(inputDir, 'items-base.json');
  return (data.itemMastery ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeMastery(raw))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildCharOptions(inputDir: string): CharOptionEntry[] {
  const data = readDataFile<{ charoption?: RawCharOption[] }>(
    inputDir,
    'charcreationoptions.json',
  );
  return (data.charoption ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeCharOption(raw))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildTables(inputDir: string): TableEntry[] {
  const data = readDataFile<{ table?: RawTable[] }>(inputDir, 'tables.json');
  return (data.table ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeTable(raw))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildDecks(inputDir: string): DeckEntry[] {
  const data = readDataFile<{ deck?: RawDeck[] }>(inputDir, 'decks.json');
  return (data.deck ?? [])
    .filter((raw) => keepEntry(raw))
    .map((raw) => normalizeDeck(raw))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeIds<T extends { id: string; source: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      continue;
    }
    let candidate = `${item.id}-${slugify(item.source)}`;
    let n = 2;
    while (seen.has(candidate)) candidate = `${item.id}-${slugify(item.source)}-${n++}`;
    item.id = candidate;
    seen.add(candidate);
  }
  return items;
}

function finalize<
  T extends {
    id: string;
    name: string;
    source: string;
    entries?: unknown[];
    hidden?: boolean;
    otherVersions?: Array<{ id: string; source: string }>;
  },
>(items: T[], dropEmpty: boolean): T[] {
  const list = dropEmpty
    ? items.filter((i) => !Array.isArray(i.entries) || i.entries.length > 0)
    : items.slice();

  list.sort(
    (a, b) => a.name.localeCompare(b.name) || sourceRank(b.source) - sourceRank(a.source),
  );
  dedupeIds(list);

  const groups = new Map<string, T[]>();
  for (const item of list) {
    const key = item.name.toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => sourceRank(b.source) - sourceRank(a.source));
    group.forEach((item, index) => {
      if (index > 0) item.hidden = true;
      item.otherVersions = group
        .filter((other) => other.id !== item.id)
        .map((other) => ({ id: other.id, source: other.source }));
    });
  }

  return list.sort(
    (a, b) => a.name.localeCompare(b.name) || sourceRank(b.source) - sourceRank(a.source),
  );
}

function writeCategory<
  T extends { id: string; name: string; source: string; entries?: unknown[] },
>(category: string, items: T[], sourceCommit: string, dropEmpty = false): void {
  const finalItems = dedupeIds(finalize(items, dropEmpty));
  const file: CompendiumFile<T> = {
    meta: {
      category,
      count: finalItems.length,
      sourceRepo: SOURCE_REPO,
      sourceCommit,
      generatedAt: new Date().toISOString(),
    },
    items: finalItems,
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, `${category}.json`), JSON.stringify(file));
  console.log(`  ${category}: ${finalItems.length} entries`);
}

interface RawBookMeta {
  id: string;
  name: string;
  source: string;
  group?: string;
  author?: string;
  published?: string;
  storyline?: string;
  cover?: { path?: string; href?: { path?: string } };
  contents?: BookContentsEntry[];
}

const BOOKS_OUTPUT_DIR = 'public/data';

function buildBooks(inputDir: string): void {
  const index: BookIndexEntry[] = [];

  const processDoc = (
    meta: RawBookMeta,
    type: 'book' | 'adventure',
    subDir: string,
    filePrefix: string,
  ): void => {
    const idLower = meta.id.toLowerCase();
    let data: { data?: unknown[] };
    try {
      data = readDataFile(inputDir, join(subDir, `${filePrefix}-${idLower}.json`));
    } catch {
      return;
    }
    mkdirSync(join(BOOKS_OUTPUT_DIR, subDir), { recursive: true });
    writeFileSync(
      join(BOOKS_OUTPUT_DIR, subDir, `${idLower}.json`),
      JSON.stringify({ data: data.data ?? [] }),
    );
    const cover = meta.cover?.href?.path ?? meta.cover?.path;
    index.push({
      id: idLower,
      name: meta.name,
      source: meta.source,
      group: meta.group ?? '',
      type,
      ...(meta.author ? { author: meta.author } : {}),
      ...(meta.published ? { published: meta.published } : {}),
      ...(meta.storyline ? { storyline: meta.storyline } : {}),
      ...(cover ? { cover } : {}),
      contents: meta.contents ?? [],
    });
  };

  const books = readDataFile<{ book?: RawBookMeta[] }>(inputDir, 'books.json').book ?? [];
  for (const b of books) processDoc(b, 'book', 'book', 'book');
  const advs =
    readDataFile<{ adventure?: RawBookMeta[] }>(inputDir, 'adventures.json').adventure ??
    [];
  for (const a of advs) processDoc(a, 'adventure', 'adventure', 'adventure');

  index.sort((a, b) => a.name.localeCompare(b.name));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'books.json'), JSON.stringify(index));
  console.log(
    `  books: ${index.filter((i) => i.type === 'book').length}, ` +
      `adventures: ${index.filter((i) => i.type === 'adventure').length}`,
  );
}

function main(): void {
  const inputDir = resolveInputDir(process.argv.slice(2));
  const sourceCommit = readSourceCommit(inputDir);
  const sources = loadCoreSupplementSources(inputDir);
  setAllowedSources(sources);
  setSourceRanks(loadSourceRanks(inputDir));
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    join(OUTPUT_DIR, 'sources.json'),
    JSON.stringify(loadSourceNames(inputDir)),
  );
  console.log(
    `Building compendium data from ${inputDir} @ ${sourceCommit} ` +
      `(${sources.size} Core/Supplement sources)`,
  );

  const fluff = (file: string, key: string) => loadFluff(inputDir, [file], key);

  writeCategory('spells', buildSpells(inputDir), sourceCommit);
  writeCategory('conditions', buildConditions(inputDir), sourceCommit, true);
  writeCategory(
    'species',
    attachFluff(buildSpecies(inputDir), fluff('fluff-races.json', 'raceFluff')),
    sourceCommit,
    true,
  );
  writeCategory(
    'feats',
    attachFluff(buildFeats(inputDir), fluff('fluff-feats.json', 'featFluff')),
    sourceCommit,
    true,
  );
  writeCategory(
    'backgrounds',
    attachFluff(
      buildBackgrounds(inputDir),
      fluff('fluff-backgrounds.json', 'backgroundFluff'),
    ),
    sourceCommit,
    true,
  );
  writeCategory('rules', buildRules(inputDir), sourceCommit, true);
  writeCategory(
    'items',
    attachFluff(buildItems(inputDir), fluff('fluff-items.json', 'itemFluff')),
    sourceCommit,
  );
  writeCategory('classes', buildClasses(inputDir), sourceCommit);
  writeCategory('bestiary', buildMonsters(inputDir), sourceCommit);
  writeCategory('actions', buildActions(inputDir), sourceCommit, true);
  writeCategory(
    'optionalfeatures',
    attachFluff(
      buildOptionalFeatures(inputDir),
      fluff('fluff-optionalfeatures.json', 'optionalfeatureFluff'),
    ),
    sourceCommit,
    true,
  );
  writeCategory('deities', buildDeities(inputDir), sourceCommit);
  writeCategory('hazards', buildHazards(inputDir), sourceCommit, true);
  writeCategory('boons', buildBoons(inputDir), sourceCommit, true);
  writeCategory('skills', buildSkills(inputDir), sourceCommit, true);
  writeCategory('senses', buildSenses(inputDir), sourceCommit, true);
  writeCategory('languages', buildLanguages(inputDir), sourceCommit);
  writeCategory('cultsboons', buildCultsBoons(inputDir), sourceCommit, true);
  writeCategory('facilities', buildFacilities(inputDir), sourceCommit, true);
  writeCategory('recipes', buildRecipes(inputDir), sourceCommit);
  writeCategory(
    'objects',
    attachFluff(buildObjects(inputDir), fluff('fluff-objects.json', 'objectFluff')),
    sourceCommit,
  );
  writeCategory(
    'vehicles',
    attachFluff(buildVehicles(inputDir), fluff('fluff-vehicles.json', 'vehicleFluff')),
    sourceCommit,
  );
  writeCategory('masteries', buildMasteries(inputDir), sourceCommit, true);
  writeCategory('charoptions', buildCharOptions(inputDir), sourceCommit, true);
  writeCategory('tables', buildTables(inputDir), sourceCommit);
  writeCategory('decks', buildDecks(inputDir), sourceCommit, true);
  buildBooks(inputDir);

  console.log('Done.');
}

main();
