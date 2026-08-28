import type { Entry } from './entry';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface GalleryImage {
  path: string;
  title?: string;
  credit?: string;
}

export interface BookContentsEntry {
  name: string;
  headers?: Array<string | { header: string }>;
}

export interface BookIndexEntry {
  id: string;
  name: string;
  source: string;
  group: string;
  type: 'book' | 'adventure';
  author?: string;
  published?: string;
  storyline?: string;
  cover?: string;
  contents: BookContentsEntry[];
}

export interface CompendiumEntryBase {
  id: string;
  name: string;

  englishName?: string;
  source: string;
  page?: number;
  srd: boolean;

  image?: string;

  token?: string;

  lore?: Entry[];

  gallery?: GalleryImage[];

  hidden?: boolean;

  ua?: boolean;

  otherVersions?: Array<{ id: string; source: string }>;
}

export interface SpellEntry extends CompendiumEntryBase {
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  classes?: string[];
  subclasses?: string[];
  _englishClasses?: string[];
  _englishSubclasses?: string[];
  entries: Entry[];
  entriesHigherLevel?: Entry[];
}

export type ConditionKind = 'condition' | 'disease' | 'status';

export interface ConditionEntry extends CompendiumEntryBase {
  kind: ConditionKind;
  entries: Entry[];
}

export interface SpeciesEntry extends CompendiumEntryBase {
  size: string;
  speed: string;

  walkSpeed: number;
  flySpeed: number;
  swimSpeed: number;
  climbSpeed: number;
  creatureType: string;

  parentRace: string;
  entries: Entry[];
}

export interface MasteryEntry extends CompendiumEntryBase {
  entries: Entry[];
}

export interface CharOptionEntry extends CompendiumEntryBase {
  optionType: string;
  prerequisite: string;
  entries: Entry[];
}

export interface TableEntry extends CompendiumEntryBase {
  caption: string;
  colLabels: string[];
  rows: Entry[][];
}

export interface DeckEntry extends CompendiumEntryBase {
  cardCount: number;
  entries: Entry[];
}

export interface FeatEntry extends CompendiumEntryBase {
  category: string;
  prerequisite: string;
  entries: Entry[];
}

export interface BackgroundEntry extends CompendiumEntryBase {
  abilityScores: string;
  skills: string;
  tools: string;
  feat: string;
  entries: Entry[];
}

export interface RuleEntry extends CompendiumEntryBase {
  ruleType: string;
  entries: Entry[];
}

export interface ItemEntry extends CompendiumEntryBase {
  type: string;
  rarity: string;
  attunement: string;
  weight: string;
  value: string;
  damage: string;
  ac: string;
  properties: string;
  range: string;

  weaponCategory?: string;
  propertyRefs?: string[];
  mastery?: string;
  masteryRefs?: string[];
  variant?: JsonObject;
  entries: Entry[];
}

export interface ItemVariantBaseItem {
  name: string;
  source: string;
}

export interface SourceDataEntry extends CompendiumEntryBase {
  collection: string;
  data: JsonObject;
  entries: Entry[];
}

export interface ClassFeature {
  level: number;
  name: string;
  entries: Entry[];
}

export interface ClassSubclass {
  id?: string;
  name: string;
  englishName?: string;
  source: string;
  image?: string;
  gallery?: GalleryImage[];
  features: ClassFeature[];
  lore?: Entry[];
}

export interface ClassTable {
  headers: string[];
  rows: string[][];
}

export interface ClassEntry extends CompendiumEntryBase {
  intro?: Entry[];
  hitDie: string;
  primaryAbility: string;
  savingThrows: string;
  proficiencies: string;

  armorProficiencies: string;
  weaponProficiencies: string;
  toolProficiencies: string;
  subclassTitle: string;
  table: ClassTable;
  features: ClassFeature[];
  subclasses: ClassSubclass[];
}

export interface ActionEntry extends CompendiumEntryBase {
  time: string;
  entries: Entry[];
}

export interface OptionalFeatureEntry extends CompendiumEntryBase {
  featureType: string;
  prerequisite: string;
  entries: Entry[];
}

export interface DeityEntry extends CompendiumEntryBase {
  pantheon: string;
  alignment: string;
  domains: string;
  symbol: string;
  entries: Entry[];
}

export interface HazardEntry extends CompendiumEntryBase {
  hazardType: string;
  entries: Entry[];
}

export interface BoonEntry extends CompendiumEntryBase {
  boonType: string;
  entries: Entry[];
}

export interface SkillEntry extends CompendiumEntryBase {
  ability: string;
  entries: Entry[];
}

export interface SenseEntry extends CompendiumEntryBase {
  entries: Entry[];
}

export interface LanguageEntry extends CompendiumEntryBase {
  languageType: string;
  script: string;
  typicalSpeakers: string;
  entries: Entry[];
}

export interface CultBoonEntry extends CompendiumEntryBase {
  kind: string;
  category: string;
  entries: Entry[];
}

export interface FacilityEntry extends CompendiumEntryBase {
  facilityType: string;
  level: string;
  prerequisite: string;
  space: string;
  orders: string;
  entries: Entry[];
}

export interface RecipeEntry extends CompendiumEntryBase {
  recipeType: string;
  serves: string;
  diet: string;
  entries: Entry[];
}

export interface StatBlockSection {
  name: string;
  entries: Entry[];
}

export interface ObjectEntry extends CompendiumEntryBase {
  size: string;
  objectType: string;
  ac: string;
  hp: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  immune: string;
  senses: string;
  actions: StatBlockSection[];
}

export interface VehicleEntry extends CompendiumEntryBase {
  vehicleType: string;
  size: string;
  dimensions: string;
  terrain: string;
  capacity: string;
  pace: string;
  speed: string;
  cost: string;
  ac: string;
  hp: string;
  immune: string;
  entries: Entry[];
  weapons: StatBlockSection[];
}

export interface MonsterEntry extends CompendiumEntryBase {
  size: string;
  creatureType: string;
  alignment: string;
  ac: string;
  initiative: string;
  hp: string;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  saves: string;
  skills: string;
  vulnerabilities: string;
  resistances: string;
  immunities: string;
  conditionImmunities: string;
  senses: string;
  languages: string;
  cr: string;

  crDisplay: string;
  habitat: string;
  _englishHabitat?: string;
  treasure: string;
  traits: StatBlockSection[];
  spellcasting: StatBlockSection[];
  actions: StatBlockSection[];
  bonusActions: StatBlockSection[];
  reactions: StatBlockSection[];
  legendaryActions: StatBlockSection[];

  legendaryIntro: string;
  lairActions: Entry[];
  regionalEffects: Entry[];
}

export interface CompendiumFile<T> {
  meta: {
    category: string;
    count: number;
    sourceRepo: string;
    sourceCommit: string;
    generatedAt: string;
  };
  items: T[];
}

export type CompendiumCategoryId =
  | 'spells'
  | 'firearms'
  | 'conditions'
  | 'species'
  | 'feats'
  | 'backgrounds'
  | 'rules'
  | 'items'
  | 'classes'
  | 'bestiary'
  | 'actions'
  | 'optionalfeatures'
  | 'deities'
  | 'hazards'
  | 'boons'
  | 'skills'
  | 'senses'
  | 'languages'
  | 'cultsboons'
  | 'facilities'
  | 'recipes'
  | 'objects'
  | 'vehicles'
  | 'masteries'
  | 'charoptions'
  | 'tables'
  | 'decks'
  | 'psionics'
  | 'encounters'
  | 'loot'
  | 'life'
  | 'names'
  | 'monsterfeatures'
  | 'homecrafts';
