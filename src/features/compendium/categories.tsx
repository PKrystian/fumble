import type { ReactNode } from 'react';
import type {
  ActionEntry,
  BackgroundEntry,
  BoonEntry,
  CharOptionEntry,
  ClassEntry,
  CompendiumCategoryId,
  CompendiumEntryBase,
  CompendiumFile,
  ConditionEntry,
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
  RuleEntry,
  SenseEntry,
  SkillEntry,
  SpeciesEntry,
  SpellEntry,
  TableEntry,
  VehicleEntry,
} from '@/data/compendium/types';
import { sourceName } from '@/data/compendium/sources';
import type { Locale } from '@/i18n/locales';
import { XP_BY_CR } from '@/features/dm/xp';
import {
  ActionDetail,
  BackgroundDetail,
  BoonDetail,
  CharOptionDetail,
  ClassDetail,
  ConditionDetail,
  CultBoonDetail,
  DeckDetail,
  DeityDetail,
  FacilityDetail,
  FeatDetail,
  HazardDetail,
  ItemDetail,
  LanguageDetail,
  MasteryDetail,
  MonsterDetail,
  ObjectDetail,
  OptionalFeatureDetail,
  RecipeDetail,
  RuleDetail,
  SenseDetail,
  SkillDetail,
  SpeciesDetail,
  SpellDetail,
  TableDetail,
  VehicleDetail,
} from './details';

export interface CategoryFilter {
  id: string;
  label: string;

  valuesFor: (item: CompendiumEntryBase) => string[];

  sortKey?: (value: string) => number;

  labelFor?: (value: string, locale?: Locale) => string;
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export interface CompendiumCategory {
  id: CompendiumCategoryId;
  label: string;

  load: () => Promise<CompendiumEntryBase[]>;

  subtitle: (item: CompendiumEntryBase, t: TranslateFn) => string;
  renderDetail: (item: CompendiumEntryBase) => ReactNode;

  filters?: CategoryFilter[];
}

function field<T>(
  id: string,
  label: string,
  get: (item: T) => string | number | undefined,
  sortKey?: (value: string) => number,
): CategoryFilter {
  return {
    id,
    label,
    valuesFor: (item) => {
      const value = get(item as T);
      return value == null || value === '' ? [] : [String(value)];
    },
    ...(sortKey ? { sortKey } : {}),
  };
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0]!.toUpperCase() + value.slice(1) : value;
}

function splitField<T>(
  id: string,
  label: string,
  get: (item: T) => string,
  separator: string | RegExp = ',',
): CategoryFilter {
  return {
    id,
    label,
    valuesFor: (item) =>
      (get(item as T) ?? '')
        .split(separator)
        .map((v) => capitalize(v.trim()))
        .filter(Boolean),
  };
}

function presenceField<T>(
  id: string,
  label: string,
  get: (item: T) => string | boolean | undefined,
): CategoryFilter {
  return {
    id,
    label,
    valuesFor: (item) => {
      const value = get(item as T);
      return [typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value ? 'Yes' : 'No'];
    },
  };
}

const sourceFilter: CategoryFilter = {
  ...field(
    'source',
    'compendium.filters.labels.source',
    (i: CompendiumEntryBase) => i.source,
  ),
  labelFor: (value, locale) => sourceName(value, locale),
};

const spellLevel = (level: number, t: TranslateFn) =>
  level === 0
    ? t('compendium.detail.cantripShort')
    : t('compendium.detail.levelShort', { level });

function loader<T>(load: () => Promise<{ default: unknown }>): () => Promise<T[]> {
  return async () => {
    const mod = await load();
    return (mod.default as CompendiumFile<T>).items;
  };
}

export const categories: CompendiumCategory[] = [
  {
    id: 'species',
    label: 'Species',
    load: loader<SpeciesEntry>(() => import('@/data/generated/species.json')),
    subtitle: (item) => (item as SpeciesEntry).size,
    renderDetail: (item) => <SpeciesDetail species={item as SpeciesEntry} />,
  },
  {
    id: 'classes',
    label: 'Classes',
    load: loader<ClassEntry>(() => import('@/data/generated/classes.json')),
    subtitle: (item, t) =>
      t('compendium.detail.hitDieValue', { die: (item as ClassEntry).hitDie }),
    renderDetail: (item) => <ClassDetail cls={item as ClassEntry} />,
  },
  {
    id: 'backgrounds',
    label: 'Backgrounds',
    load: loader<BackgroundEntry>(() => import('@/data/generated/backgrounds.json')),
    subtitle: (item, t) =>
      (item as BackgroundEntry).feat || t('compendium.detail.background'),
    renderDetail: (item) => <BackgroundDetail background={item as BackgroundEntry} />,
  },
  {
    id: 'feats',
    label: 'Feats',
    load: loader<FeatEntry>(() => import('@/data/generated/feats.json')),
    subtitle: (item, t) =>
      t('compendium.detail.featCategory', { category: (item as FeatEntry).category }),
    renderDetail: (item) => <FeatDetail feat={item as FeatEntry} />,
  },
  {
    id: 'optionalfeatures',
    label: 'Options & Features',
    load: loader<OptionalFeatureEntry>(
      () => import('@/data/generated/optionalfeatures.json'),
    ),
    subtitle: (item) => (item as OptionalFeatureEntry).featureType,
    renderDetail: (item) => (
      <OptionalFeatureDetail feature={item as OptionalFeatureEntry} />
    ),
  },
  {
    id: 'spells',
    label: 'Spells',
    load: loader<SpellEntry>(() => import('@/data/generated/spells.json')),
    subtitle: (item, t) => {
      const spell = item as SpellEntry;
      return `${spellLevel(spell.level, t)} · ${spell.school}`;
    },
    renderDetail: (item) => <SpellDetail spell={item as SpellEntry} />,
  },
  {
    id: 'items',
    label: 'Items',
    load: loader<ItemEntry>(() => import('@/data/generated/items.json')),
    subtitle: (item) => {
      const it = item as ItemEntry;
      return [it.type, it.rarity].filter(Boolean).join(' · ');
    },
    renderDetail: (item) => <ItemDetail item={item as ItemEntry} />,
  },
  {
    id: 'bestiary',
    label: 'Bestiary',
    load: loader<MonsterEntry>(() => import('@/data/generated/bestiary.json')),
    subtitle: (item, t) => {
      const m = item as MonsterEntry;
      return `${t('compendium.detail.crValue', { cr: m.cr })} · ${[m.size, m.creatureType].filter(Boolean).join(' ')}`;
    },
    renderDetail: (item) => <MonsterDetail monster={item as MonsterEntry} />,
  },
  {
    id: 'actions',
    label: 'Actions',
    load: loader<ActionEntry>(() => import('@/data/generated/actions.json')),
    subtitle: (item, t) => (item as ActionEntry).time || t('compendium.detail.action'),
    renderDetail: (item) => <ActionDetail action={item as ActionEntry} />,
  },
  {
    id: 'conditions',
    label: 'Conditions',
    load: loader<ConditionEntry>(() => import('@/data/generated/conditions.json')),
    subtitle: (item) => (item as ConditionEntry).kind,
    renderDetail: (item) => <ConditionDetail condition={item as ConditionEntry} />,
  },
  {
    id: 'rules',
    label: 'Rules',
    load: loader<RuleEntry>(() => import('@/data/generated/rules.json')),
    subtitle: (item, t) =>
      t('compendium.detail.ruleType', { type: (item as RuleEntry).ruleType }),
    renderDetail: (item) => <RuleDetail rule={item as RuleEntry} />,
  },
  {
    id: 'deities',
    label: 'Deities',
    load: loader<DeityEntry>(() => import('@/data/generated/deities.json')),
    subtitle: (item, t) => (item as DeityEntry).pantheon || t('compendium.detail.deity'),
    renderDetail: (item) => <DeityDetail deity={item as DeityEntry} />,
  },
  {
    id: 'hazards',
    label: 'Hazards',
    load: loader<HazardEntry>(() => import('@/data/generated/hazards.json')),
    subtitle: (item) => (item as HazardEntry).hazardType,
    renderDetail: (item) => <HazardDetail hazard={item as HazardEntry} />,
  },
  {
    id: 'boons',
    label: 'Boons',
    load: loader<BoonEntry>(() => import('@/data/generated/boons.json')),
    subtitle: (item) => (item as BoonEntry).boonType,
    renderDetail: (item) => <BoonDetail boon={item as BoonEntry} />,
  },
  {
    id: 'skills',
    label: 'Skills',
    load: loader<SkillEntry>(() => import('@/data/generated/skills.json')),
    subtitle: (item, t) => (item as SkillEntry).ability || t('compendium.detail.skill'),
    renderDetail: (item) => <SkillDetail skill={item as SkillEntry} />,
  },
  {
    id: 'senses',
    label: 'Senses',
    load: loader<SenseEntry>(() => import('@/data/generated/senses.json')),
    subtitle: (_, t) => t('compendium.detail.sense'),
    renderDetail: (item) => <SenseDetail sense={item as SenseEntry} />,
  },
  {
    id: 'languages',
    label: 'Languages',
    load: loader<LanguageEntry>(() => import('@/data/generated/languages.json')),
    subtitle: (item) => (item as LanguageEntry).languageType,
    renderDetail: (item) => <LanguageDetail language={item as LanguageEntry} />,
  },
  {
    id: 'cultsboons',
    label: 'Cults & Boons',
    load: loader<CultBoonEntry>(() => import('@/data/generated/cultsboons.json')),
    subtitle: (item) => {
      const cb = item as CultBoonEntry;
      return [cb.category, cb.kind].filter(Boolean).join(' ');
    },
    renderDetail: (item) => <CultBoonDetail cultBoon={item as CultBoonEntry} />,
  },
  {
    id: 'facilities',
    label: 'Bastions',
    load: loader<FacilityEntry>(() => import('@/data/generated/facilities.json')),
    subtitle: (item, t) => {
      const f = item as FacilityEntry;
      return [
        f.facilityType,
        f.level && t('compendium.detail.levelValue', { level: f.level }),
      ]
        .filter(Boolean)
        .join(' · ');
    },
    renderDetail: (item) => <FacilityDetail facility={item as FacilityEntry} />,
  },
  {
    id: 'recipes',
    label: 'Recipes',
    load: loader<RecipeEntry>(() => import('@/data/generated/recipes.json')),
    subtitle: (item) => (item as RecipeEntry).recipeType,
    renderDetail: (item) => <RecipeDetail recipe={item as RecipeEntry} />,
  },
  {
    id: 'objects',
    label: 'Objects',
    load: loader<ObjectEntry>(() => import('@/data/generated/objects.json')),
    subtitle: (item) => {
      const o = item as ObjectEntry;
      return [o.size, o.objectType].filter(Boolean).join(' ');
    },
    renderDetail: (item) => <ObjectDetail object={item as ObjectEntry} />,
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    load: loader<VehicleEntry>(() => import('@/data/generated/vehicles.json')),
    subtitle: (item) => {
      const v = item as VehicleEntry;
      return [v.size, v.vehicleType].filter(Boolean).join(' ');
    },
    renderDetail: (item) => <VehicleDetail vehicle={item as VehicleEntry} />,
  },
  {
    id: 'masteries',
    label: 'Weapon Masteries',
    load: loader<MasteryEntry>(() => import('@/data/generated/masteries.json')),
    subtitle: (_, t) => t('compendium.detail.weaponMastery'),
    renderDetail: (item) => <MasteryDetail mastery={item as MasteryEntry} />,
  },
  {
    id: 'charoptions',
    label: 'Character Options',
    load: loader<CharOptionEntry>(() => import('@/data/generated/charoptions.json')),
    subtitle: (item) => (item as CharOptionEntry).optionType,
    renderDetail: (item) => <CharOptionDetail option={item as CharOptionEntry} />,
  },
  {
    id: 'tables',
    label: 'Tables',
    load: loader<TableEntry>(() => import('@/data/generated/tables.json')),
    subtitle: (_, t) => t('compendium.detail.table'),
    renderDetail: (item) => <TableDetail table={item as TableEntry} />,
  },
  {
    id: 'decks',
    label: 'Decks',
    load: loader<DeckEntry>(() => import('@/data/generated/decks.json')),
    subtitle: (item, t) =>
      t('compendium.detail.deckCardsShort', { count: (item as DeckEntry).cardCount }),
    renderDetail: (item) => <DeckDetail deck={item as DeckEntry} />,
  },
];

function filterLabel(key: string): string {
  return `compendium.filters.labels.${key}`;
}

const FILTERS_BY_ID: Partial<Record<CompendiumCategoryId, CategoryFilter[]>> = {
  species: [
    field<SpeciesEntry>('size', filterLabel('size'), (i) => i.size),
    field<SpeciesEntry>(
      'creatureType',
      filterLabel('creatureType'),
      (i) => i.creatureType,
    ),
  ],
  feats: [field<FeatEntry>('category', filterLabel('category'), (i) => i.category)],
  spells: [
    {
      id: 'level',
      label: filterLabel('level'),
      valuesFor: (i) => {
        const level = (i as SpellEntry).level;
        return [level === 0 ? 'Cantrip' : `Level ${level}`];
      },
      sortKey: (v) => (v === 'Cantrip' ? 0 : Number(v.replace('Level ', ''))),
    },
    field<SpellEntry>('school', filterLabel('school'), (i) => i.school),
    presenceField<SpellEntry>(
      'concentration',
      filterLabel('concentration'),
      (i) => i.concentration,
    ),
    presenceField<SpellEntry>('ritual', filterLabel('ritual'), (i) => i.ritual),
  ],
  items: [
    field<ItemEntry>('type', filterLabel('type'), (i) => i.type),
    field<ItemEntry>('rarity', filterLabel('rarity'), (i) => i.rarity),
    presenceField<ItemEntry>(
      'attunement',
      filterLabel('attunement'),
      (i) => i.attunement,
    ),
    splitField<ItemEntry>('properties', filterLabel('properties'), (i) => i.properties),
  ],
  bestiary: [
    {
      id: 'cr',
      label: filterLabel('cr'),
      valuesFor: (i) => [(i as MonsterEntry).cr],
      sortKey: (v) => XP_BY_CR[v] ?? -1,
    },
    field<MonsterEntry>('type', filterLabel('type'), (i) =>
      (i.creatureType ?? '').replace(/\s*\(.*\)$/, ''),
    ),
    field<MonsterEntry>('size', filterLabel('size'), (i) => i.size),
    field<MonsterEntry>('alignment', filterLabel('alignment'), (i) => i.alignment),

    splitField<MonsterEntry>(
      'resistances',
      filterLabel('resistances'),
      (i) => i.resistances,
      ';',
    ),
    splitField<MonsterEntry>(
      'immunities',
      filterLabel('immunities'),
      (i) => i.immunities,
      ';',
    ),
    splitField<MonsterEntry>(
      'conditionImmunities',
      filterLabel('conditionImmunities'),
      (i) => i.conditionImmunities,
      ';',
    ),
    splitField<MonsterEntry>('languages', filterLabel('languages'), (i) => i.languages),
  ],
  conditions: [field<ConditionEntry>('kind', filterLabel('kind'), (i) => i.kind)],
  optionalfeatures: [
    {
      id: 'featureType',
      label: filterLabel('type'),
      valuesFor: (i) =>
        ((i as OptionalFeatureEntry).featureType ?? '').split(', ').filter(Boolean),
    },
  ],
  rules: [field<RuleEntry>('ruleType', filterLabel('type'), (i) => i.ruleType)],
  deities: [field<DeityEntry>('pantheon', filterLabel('pantheon'), (i) => i.pantheon)],
  hazards: [field<HazardEntry>('hazardType', filterLabel('type'), (i) => i.hazardType)],
  boons: [field<BoonEntry>('boonType', filterLabel('type'), (i) => i.boonType)],
  skills: [field<SkillEntry>('ability', filterLabel('ability'), (i) => i.ability)],
  languages: [
    field<LanguageEntry>('languageType', filterLabel('type'), (i) => i.languageType),
  ],
  cultsboons: [
    field<CultBoonEntry>('kind', filterLabel('kind'), (i) => i.kind),
    field<CultBoonEntry>('category', filterLabel('category'), (i) => i.category),
  ],
  facilities: [
    field<FacilityEntry>('facilityType', filterLabel('type'), (i) => i.facilityType),
  ],
  recipes: [field<RecipeEntry>('recipeType', filterLabel('type'), (i) => i.recipeType)],
  objects: [field<ObjectEntry>('objectType', filterLabel('type'), (i) => i.objectType)],
  vehicles: [
    field<VehicleEntry>('vehicleType', filterLabel('type'), (i) => i.vehicleType),
  ],
  charoptions: [
    field<CharOptionEntry>('optionType', filterLabel('type'), (i) => i.optionType),
  ],
};

for (const category of categories) {
  category.filters = [...(FILTERS_BY_ID[category.id] ?? []), sourceFilter];
}

export function getCategory(id: string | undefined): CompendiumCategory | undefined {
  return categories.find((category) => category.id === id);
}
