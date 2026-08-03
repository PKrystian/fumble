import type {
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
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
type AnyNormalizer = (raw: any, locale: Locale) => CompendiumEntryBase;

const KEY_MAP: Record<
  string,
  { category: CompendiumCategoryId; normalize: AnyNormalizer }
> = {
  spell: { category: 'spells', normalize: (r, locale) => normalizeSpell(r, locale) },
  condition: {
    category: 'conditions',
    normalize: (r) => normalizeCondition(r, 'condition'),
  },
  disease: { category: 'conditions', normalize: (r) => normalizeCondition(r, 'disease') },
  status: { category: 'conditions', normalize: (r) => normalizeCondition(r, 'status') },
  race: {
    category: 'species',
    normalize: (r, locale) => normalizeSpecies(r, undefined, locale),
  },
  subrace: {
    category: 'species',
    normalize: (r, locale) => normalizeSubrace(r, undefined, locale),
  },
  feat: {
    category: 'feats',
    normalize: (r, locale) => normalizeFeat(r, undefined, locale),
  },
  background: {
    category: 'backgrounds',
    normalize: (r, locale) => normalizeBackground(r, undefined, locale),
  },
  variantrule: { category: 'rules', normalize: (r, locale) => normalizeRule(r, locale) },
  item: {
    category: 'items',
    normalize: (r, locale) => normalizeItem(r, undefined, locale),
  },
  baseitem: {
    category: 'items',
    normalize: (r, locale) => normalizeItem(r, undefined, locale),
  },
  monster: {
    category: 'bestiary',
    normalize: (r, locale) => normalizeMonster(r, undefined, undefined, locale),
  },
  action: { category: 'actions', normalize: (r, locale) => normalizeAction(r, locale) },
  optionalfeature: {
    category: 'optionalfeatures',
    normalize: (r, locale) => normalizeOptionalFeature(r, locale),
  },
  deity: { category: 'deities', normalize: (r, locale) => normalizeDeity(r, locale) },
  trap: {
    category: 'hazards',
    normalize: (r, locale) => normalizeHazard(r, 'Trap', locale),
  },
  hazard: {
    category: 'hazards',
    normalize: (r, locale) => normalizeHazard(r, 'Hazard', locale),
  },
  reward: { category: 'boons', normalize: (r) => normalizeBoon(r) },
  skill: { category: 'skills', normalize: (r, locale) => normalizeSkill(r, locale) },
  sense: { category: 'senses', normalize: (r) => normalizeSense(r) },
  language: {
    category: 'languages',
    normalize: (r, locale) => normalizeLanguage(r, locale),
  },
  cult: { category: 'cultsboons', normalize: (r) => normalizeCultBoon(r, 'Cult') },
  boon: { category: 'cultsboons', normalize: (r) => normalizeCultBoon(r, 'Boon') },
  facility: {
    category: 'facilities',
    normalize: (r, locale) => normalizeFacility(r, locale),
  },
  recipe: { category: 'recipes', normalize: (r, locale) => normalizeRecipe(r, locale) },
  object: { category: 'objects', normalize: (r, locale) => normalizeObject(r, locale) },
  vehicle: {
    category: 'vehicles',
    normalize: (r, locale) => normalizeVehicle(r, undefined, locale),
  },
  itemMastery: { category: 'masteries', normalize: (r) => normalizeMastery(r) },
  charoption: {
    category: 'charoptions',
    normalize: (r, locale) => normalizeCharOption(r, locale),
  },
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

export function parse5etoolsHomebrew(
  obj: Record<string, unknown>,
  locale: Locale = 'en',
): ParseResult {
  const entries: ImportedEntry[] = [];
  const subclasses: Array<{ className: string; subclass: ClassSubclass }> = [];
  const skipped: string[] = [];

  if (Array.isArray(obj.class) && obj.class.length) {
    try {
      for (const cls of normalizeClasses(
        obj as RawClassFile,
        undefined,
        undefined,
        locale,
      )) {
        entries.push({ category: 'classes', data: cls });
      }
    } catch {
      skipped.push('class');
    }
  } else if (Array.isArray(obj.subclass) && obj.subclass.length) {
    try {
      subclasses.push(
        ...normalizeStandaloneSubclasses(obj as RawClassFile, undefined, locale),
      );
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
        entries.push({
          category: mapping.category,
          data: mapping.normalize(raw, locale),
        });
      } catch {
        // Ignore malformed imported entry
      }
    }
  }

  return { entries, subclasses, skipped };
}
