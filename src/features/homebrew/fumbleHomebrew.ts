import type { Entry } from '@/data/compendium/entry';
import type {
  ClassFeature,
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import bestiaryData from '../../data/fumble-homebrew/bestiary.json';
import classesData from '../../data/fumble-homebrew/classes.json';
import featsData from '../../data/fumble-homebrew/feats.json';
import itemsData from '../../data/fumble-homebrew/items.json';
import optionalFeaturesData from '../../data/fumble-homebrew/optionalfeatures.json';
import rulesData from '../../data/fumble-homebrew/rules.json';
import speciesData from '../../data/fumble-homebrew/species.json';
import spellsData from '../../data/fumble-homebrew/spells.json';
import bestiaryPolish from '../../data/fumble-homebrew/pl/bestiary.json';
import classesPolish from '../../data/fumble-homebrew/pl/classes.json';
import featsPolish from '../../data/fumble-homebrew/pl/feats.json';
import itemsPolish from '../../data/fumble-homebrew/pl/items.json';
import optionalFeaturesPolish from '../../data/fumble-homebrew/pl/optionalfeatures.json';
import rulesPolish from '../../data/fumble-homebrew/pl/rules.json';
import speciesPolish from '../../data/fumble-homebrew/pl/species.json';
import spellsPolish from '../../data/fumble-homebrew/pl/spells.json';

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
  entries?: Entry[];
} & Record<string, unknown>;

interface FumbleDataFile {
  items: FumbleHomebrewItem[];
}

interface FumbleOverlay {
  name?: string;
  subtitle?: string;
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
  features?: unknown[];
  subclassName?: string;
}

function mergeClassSubclasses(
  base: unknown,
  translated: ClassSubclass[] | undefined,
): ClassSubclass[] | undefined {
  if (!translated) return undefined;
  if (!Array.isArray(base)) return translated;

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

const dataFiles = [
  featsData,
  rulesData,
  optionalFeaturesData,
  speciesData,
  bestiaryData,
  classesData,
  itemsData,
  spellsData,
] as FumbleDataFile[];

const polishOverlays = [
  featsPolish,
  rulesPolish,
  optionalFeaturesPolish,
  speciesPolish,
  bestiaryPolish,
  classesPolish,
  itemsPolish,
  spellsPolish,
] as Record<string, FumbleOverlay>[];

const englishItems = dataFiles.flatMap((file) => file.items);
const polishItems = new Map(polishOverlays.flatMap((overlay) => Object.entries(overlay)));

export const fumbleHomebrewDefinitions = englishItems;

export function fumbleHomebrewItems(locale: Locale): FumbleHomebrewItem[] {
  if (locale !== 'pl') return englishItems;

  return englishItems.map((item) => {
    const overlay = polishItems.get(item.id) ?? {};
    const { subclasses: translatedSubclassData, ...overlayFields } = overlay;
    const translatedSubclasses = mergeClassSubclasses(
      item.subclasses,
      translatedSubclassData,
    );
    return {
      ...item,
      ...overlayFields,
      ...(translatedSubclasses ? { subclasses: translatedSubclasses } : {}),
      ...(overlay.name && overlay.name !== item.name ? { englishName: item.name } : {}),
    };
  });
}

export function fumbleParentClassId(item: FumbleHomebrewItem): string | undefined {
  if (!item.isSubclass) return undefined;
  if (item.parentClassId) return item.parentClassId;
  const classIds: Record<string, string> = {
    Monk: 'monk',
    Paladin: 'paladin',
    Sorcerer: 'sorcerer',
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
