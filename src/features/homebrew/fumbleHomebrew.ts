import type { Entry } from '@/data/compendium/entry';
import type {
  ClassFeature,
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import bestiaryData from '../../data/fumble-homebrew/bestiary.json';
import actionsData from '../../data/fumble-homebrew/actions.json';
import classesData from '../../data/fumble-homebrew/classes.json';
import featsData from '../../data/fumble-homebrew/feats.json';
import itemsData from '../../data/fumble-homebrew/items.json';
import optionalFeaturesData from '../../data/fumble-homebrew/optionalfeatures.json';
import rulesData from '../../data/fumble-homebrew/rules.json';
import speciesData from '../../data/fumble-homebrew/species.json';
import spellsData from '../../data/fumble-homebrew/spells.json';
import psionicsData from '../../data/fumble-homebrew/psionics.json';
import bestiaryPolish from '../../data/fumble-homebrew/pl/bestiary.json';
import actionsPolish from '../../data/fumble-homebrew/pl/actions.json';
import classesPolish from '../../data/fumble-homebrew/pl/classes.json';
import featsPolish from '../../data/fumble-homebrew/pl/feats.json';
import itemsPolish from '../../data/fumble-homebrew/pl/items.json';
import optionalFeaturesPolish from '../../data/fumble-homebrew/pl/optionalfeatures.json';
import rulesPolish from '../../data/fumble-homebrew/pl/rules.json';
import speciesPolish from '../../data/fumble-homebrew/pl/species.json';
import spellsPolish from '../../data/fumble-homebrew/pl/spells.json';
import psionicsPolish from '../../data/fumble-homebrew/pl/psionics.json';

export const FUMBLE_SOURCE = 'Fumble';

export const FUMBLE_CAMPAIGNS = [
  {
    id: 'grobowiec-zaglady',
    labelKey: 'homebrew.fumbleCampaigns.tombOfAnnihilation',
  },
  {
    id: 'krysztalowa-sfera',
    labelKey: 'homebrew.fumbleCampaigns.crystalSphere',
  },
  {
    id: 'glod-smoka',
    labelKey: 'homebrew.fumbleCampaigns.dragonHunger',
  },
  {
    id: 'siedmiu-zbiegow',
    labelKey: 'homebrew.fumbleCampaigns.sevenFugitives',
  },
  {
    id: 'wedrowcy-granic',
    labelKey: 'homebrew.fumbleCampaigns.borderWanderers',
  },
] as const;

export type FumbleCampaignId = (typeof FUMBLE_CAMPAIGNS)[number]['id'];

export type FumbleHomebrewItem = CompendiumEntryBase & {
  _fumble?: true;
  category: CompendiumCategoryId;
  subtitle: string;
  campaigns: FumbleCampaignId[];
  alwaysVisible?: boolean;
  spellList?: string[];
  intro?: Entry[];
  isSubclass?: boolean;
  parentClassId?: string;
  subclassName?: string;
  classes?: string[];
  subclasses?: unknown;
  _englishClasses?: string[];
  _englishSubclasses?: string[];
  entries?: Entry[];
} & Record<string, unknown>;

interface FumbleDataFile {
  items: FumbleHomebrewItem[];
}

interface FumbleOverlay {
  name?: string;
  subtitle?: string;
  prerequisite?: string;
  primaryAbility?: string;
  savingThrows?: string;
  proficiencies?: string;
  armorProficiencies?: string;
  weaponProficiencies?: string;
  toolProficiencies?: string;
  subclassTitle?: string;
  table?: { headers: string[]; rows: string[][] };
  subclasses?: ClassSubclass[];
  intro?: Entry[];
  entries?: Entry[];
  lore?: Entry[];
  data?: Record<string, unknown>;
  features?: unknown[];
  subclassName?: string;
  classes?: string[];
}

const POLISH_PREREQUISITES: Record<string, string> = {
  'General feat': 'Atut ogólny',
  'Spellcasting or Pact Magic feature': 'Cecha rzucania czarów lub Magia Paktu',
  'Martial class: Fighter, Ranger, Paladin, Barbarian, or Blood Hunter':
    'Klasa wojownicza: Wojownik, Łowca, Paladyn, Barbarzyńca lub Łowca Krwi',
  'Full caster class: Cleric, Bard, Warlock, Wizard, Druid, or Sorcerer':
    'Klasa pełnego rzucania czarów: Kleryk, Bard, Czarnoksiężnik, Czarodziej, Druid lub Zaklinacz',
  'Origin feat': 'Atut pochodzenia',
};

function isSubclassArray(value: unknown): value is ClassSubclass[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        typeof (entry as Partial<ClassSubclass>).name === 'string' &&
        Array.isArray((entry as Partial<ClassSubclass>).features),
    )
  );
}

function mergeClassSubclasses(
  base: unknown,
  translated: unknown,
): ClassSubclass[] | undefined {
  if (!isSubclassArray(translated)) return undefined;
  if (!isSubclassArray(base)) return translated;

  return translated.map((subclass, index) => {
    const baseSubclass = base.find((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false;
      const value = candidate as Partial<ClassSubclass>;
      return value.name === subclass.name || value.name === subclass.englishName;
    }) as ClassSubclass | undefined;
    const fallback = base[index] as ClassSubclass | undefined;
    return (baseSubclass ?? fallback)
      ? { ...(baseSubclass ?? fallback), ...subclass }
      : subclass;
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

const dataFiles = [
  featsData,
  rulesData,
  optionalFeaturesData,
  speciesData,
  bestiaryData,
  actionsData,
  classesData,
  itemsData,
  spellsData,
  psionicsData,
] as FumbleDataFile[];

const polishOverlays = [
  featsPolish,
  rulesPolish,
  optionalFeaturesPolish,
  speciesPolish,
  bestiaryPolish,
  actionsPolish,
  classesPolish,
  itemsPolish,
  spellsPolish,
  psionicsPolish,
] as Record<string, FumbleOverlay>[];

const englishItems = dataFiles.flatMap((file) => file.items);
const polishItems = new Map(polishOverlays.flatMap((overlay) => Object.entries(overlay)));
let polishCatalog: FumbleHomebrewItem[] | undefined;

export const fumbleHomebrewDefinitions = englishItems;

export function fumbleHomebrewItems(locale: Locale): FumbleHomebrewItem[] {
  if (locale !== 'pl') return englishItems;
  if (polishCatalog) return polishCatalog;

  polishCatalog = englishItems.map((item) => {
    const overlay = polishItems.get(item.id) ?? {};
    const { subclasses: translatedSubclassData, ...overlayFields } = overlay;
    const translatedSubclasses = mergeClassSubclasses(
      item.subclasses,
      translatedSubclassData,
    );
    const basePrerequisite =
      typeof item.prerequisite === 'string' ? item.prerequisite : undefined;
    const localized = {
      ...item,
      ...overlayFields,
      ...(basePrerequisite && !overlay.prerequisite
        ? { prerequisite: POLISH_PREREQUISITES[basePrerequisite] ?? basePrerequisite }
        : {}),
      ...(translatedSubclasses ? { subclasses: translatedSubclasses } : {}),
      ...(!translatedSubclasses && translatedSubclassData !== undefined
        ? { subclasses: translatedSubclassData }
        : {}),
      ...(overlay.name && overlay.name !== item.name ? { englishName: item.name } : {}),
    };
    if (isStringArray(item.classes) && Array.isArray(overlay.classes)) {
      localized._englishClasses = item.classes;
    }
    if (isStringArray(item.subclasses) && Array.isArray(overlay.subclasses)) {
      localized._englishSubclasses = item.subclasses;
    }
    return localized;
  });
  return polishCatalog;
}

export function fumbleParentClassId(item: FumbleHomebrewItem): string | undefined {
  if (!item.isSubclass) return undefined;
  if (item.parentClassId) return item.parentClassId;
  const classIds: Record<string, string> = {
    Apothecary: 'apothecary',
    Monk: 'monk',
    Paladin: 'paladin',
    Sorcerer: 'sorcerer',
    Talent: 'talent',
    Warlock: 'warlock',
  };
  return typeof item.className === 'string' ? classIds[item.className] : undefined;
}

export function fumbleSubclass(item: FumbleHomebrewItem): ClassSubclass | undefined {
  const parentClassId = fumbleParentClassId(item);
  if (!parentClassId || !Array.isArray(item.features)) return undefined;
  return {
    id: item.id,
    name:
      item.subclassName ??
      (typeof item.name === 'string' ? item.name.replace(/^[^:]+:\s*/, '') : item.id),
    ...(item.englishName ? { englishName: item.englishName } : {}),
    source: item.source,
    ...(item.image ? { image: item.image } : {}),
    ...(item.gallery ? { gallery: item.gallery } : {}),
    features: item.features as ClassFeature[],
    ...(Array.isArray(item.lore) ? { lore: item.lore } : {}),
  };
}

export function isFumbleAlwaysVisible(item: FumbleHomebrewItem): boolean {
  return item.alwaysVisible === true;
}

export function isFumbleHomebrew(item: CompendiumEntryBase): item is FumbleHomebrewItem {
  return (item as Partial<FumbleHomebrewItem>)._fumble === true;
}
