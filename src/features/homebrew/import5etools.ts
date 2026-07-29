import type {
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import {
  type RawClassFile,
  normalizeAction,
  normalizeBackground,
  normalizeBoon,
  normalizeCharOption,
  normalizeClasses,
  normalizeCondition,
  normalizeCultBoon,
  normalizeDeck,
  normalizeDeity,
  normalizeFacility,
  normalizeFeat,
  normalizeHazard,
  normalizeItem,
  normalizeLanguage,
  normalizeMastery,
  normalizeMonster,
  normalizeObject,
  normalizeOptionalFeature,
  normalizeRecipe,
  normalizeRule,
  normalizeSense,
  normalizeSkill,
  normalizeSpecies,
  normalizeStandaloneSubclasses,
  normalizeSubrace,
  normalizeSpell,
  normalizeTable,
  normalizeVehicle,
} from '@/data/transform/normalize';

export interface ImportedEntry {
  category: CompendiumCategoryId;
  data: CompendiumEntryBase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNormalizer = (raw: any) => CompendiumEntryBase;

const KEY_MAP: Record<
  string,
  { category: CompendiumCategoryId; normalize: AnyNormalizer }
> = {
  spell: { category: 'spells', normalize: normalizeSpell },
  condition: {
    category: 'conditions',
    normalize: (r) => normalizeCondition(r, 'condition'),
  },
  disease: { category: 'conditions', normalize: (r) => normalizeCondition(r, 'disease') },
  status: { category: 'conditions', normalize: (r) => normalizeCondition(r, 'status') },
  race: { category: 'species', normalize: (r) => normalizeSpecies(r) },
  subrace: { category: 'species', normalize: (r) => normalizeSubrace(r) },
  feat: { category: 'feats', normalize: (r) => normalizeFeat(r) },
  background: { category: 'backgrounds', normalize: (r) => normalizeBackground(r) },
  variantrule: { category: 'rules', normalize: normalizeRule },
  item: { category: 'items', normalize: (r) => normalizeItem(r) },
  baseitem: { category: 'items', normalize: (r) => normalizeItem(r) },
  monster: { category: 'bestiary', normalize: (r) => normalizeMonster(r) },
  action: { category: 'actions', normalize: normalizeAction },
  optionalfeature: { category: 'optionalfeatures', normalize: normalizeOptionalFeature },
  deity: { category: 'deities', normalize: normalizeDeity },
  trap: { category: 'hazards', normalize: (r) => normalizeHazard(r, 'Trap') },
  hazard: { category: 'hazards', normalize: (r) => normalizeHazard(r, 'Hazard') },
  reward: { category: 'boons', normalize: normalizeBoon },
  skill: { category: 'skills', normalize: normalizeSkill },
  sense: { category: 'senses', normalize: normalizeSense },
  language: { category: 'languages', normalize: normalizeLanguage },
  cult: { category: 'cultsboons', normalize: (r) => normalizeCultBoon(r, 'Cult') },
  boon: { category: 'cultsboons', normalize: (r) => normalizeCultBoon(r, 'Boon') },
  facility: { category: 'facilities', normalize: normalizeFacility },
  recipe: { category: 'recipes', normalize: normalizeRecipe },
  object: { category: 'objects', normalize: normalizeObject },
  vehicle: { category: 'vehicles', normalize: (r) => normalizeVehicle(r) },
  itemMastery: { category: 'masteries', normalize: normalizeMastery },
  charoption: { category: 'charoptions', normalize: normalizeCharOption },
  table: { category: 'tables', normalize: normalizeTable },
  deck: { category: 'decks', normalize: normalizeDeck },
};

const CLASS_KEYS = new Set(['class', 'subclass', 'classFeature', 'subclassFeature']);

export const SUPPORTED_KEYS = Object.keys(KEY_MAP);

export function looks5etools(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj as Record<string, unknown>);
  return keys.includes('_meta') || keys.some((k) => k in KEY_MAP || CLASS_KEYS.has(k));
}

interface ParseResult {
  entries: ImportedEntry[];

  subclasses: Array<{ className: string; subclass: ClassSubclass }>;

  skipped: string[];
}

export function parse5etoolsHomebrew(obj: Record<string, unknown>): ParseResult {
  const entries: ImportedEntry[] = [];
  const subclasses: Array<{ className: string; subclass: ClassSubclass }> = [];
  const skipped: string[] = [];

  if (Array.isArray(obj.class) && obj.class.length) {
    try {
      for (const cls of normalizeClasses(obj as RawClassFile)) {
        entries.push({ category: 'classes', data: cls });
      }
    } catch {
      skipped.push('class');
    }
  } else if (Array.isArray(obj.subclass) && obj.subclass.length) {
    try {
      subclasses.push(...normalizeStandaloneSubclasses(obj as RawClassFile));
    } catch {
      skipped.push('subclass');
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta' || CLASS_KEYS.has(key) || !Array.isArray(value)) continue;
    const mapping = KEY_MAP[key];
    if (!mapping) {
      skipped.push(key);
      continue;
    }
    for (const raw of value) {
      if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string') continue;

      if ('_copy' in raw) continue;
      try {
        entries.push({ category: mapping.category, data: mapping.normalize(raw) });
      } catch {
        // Ignore malformed imported entry
      }
    }
  }

  return { entries, subclasses, skipped };
}
