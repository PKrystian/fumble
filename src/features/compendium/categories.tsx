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
  SourceDataEntry,
  SpeciesEntry,
  SpellEntry,
  TableEntry,
  VehicleEntry,
} from '@/data/compendium/types';
import { localizeCompendiumValue } from '@/data/compendium/localizeValue';
import { sourceName } from '@/data/compendium/sources';
import { agreeSize } from './creatureMeta';
import type { Locale } from '@/i18n/locales';
import { XP_BY_CR } from '@/features/dm/xp';
import { loadJson } from '@/data/compendium/json';
import { canonicalClassFilterValue, classFilterLabel } from './classNames';
import {
  canonicalItemProperty,
  canonicalItemRarity,
  canonicalItemType,
  canonicalSpellSchool,
  itemPropertyLabel,
  itemRarityLabel,
  itemTypeLabel,
  spellSchoolLabel,
} from './filterValues';
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
  SourceDataDetail,
  SpeciesDetail,
  SpellDetail,
  TableDetail,
  VehicleDetail,
} from './details';

export interface CategoryFilter {
  id: string;
  label: string;
  includeAny?: boolean;

  valuesFor: (item: CompendiumEntryBase) => string[];

  normalizeValue?: (value: string) => string;

  defaultVisible?: (item: CompendiumEntryBase) => boolean;

  valueLabelKey?: (value: string) => string | undefined;

  sortKey?: (value: string) => number;

  labelFor?: (value: string, locale?: Locale) => string;
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export interface CompendiumCategory {
  id: CompendiumCategoryId;
  label: string;

  load: () => Promise<CompendiumEntryBase[]>;

  subtitle: (item: CompendiumEntryBase, t: TranslateFn, locale?: Locale) => string;
  renderDetail: (item: CompendiumEntryBase) => ReactNode;

  filters?: CategoryFilter[];
}

function field<T>(
  id: string,
  label: string,
  get: (item: T) => string | number | undefined,
  normalizeValue?: (value: string) => string,
  labelFor?: (value: string, locale?: Locale) => string,
): CategoryFilter {
  return {
    id,
    label,
    valuesFor: (item) => {
      const value = get(item as T);
      return value == null || value === ''
        ? []
        : [normalizeValue?.(String(value)) ?? String(value)];
    },
    ...(normalizeValue ? { normalizeValue } : {}),
    ...(labelFor ? { labelFor } : {}),
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
  normalizeValue?: (value: string) => string,
  labelFor?: (value: string, locale?: Locale) => string,
  includeAny?: boolean,
): CategoryFilter {
  return {
    id,
    label,
    valuesFor: (item) =>
      (get(item as T) ?? '')
        .split(separator)
        .map((v) => capitalize(v.trim()))
        .map((value) => normalizeValue?.(value) ?? value)
        .filter(Boolean),
    ...(normalizeValue ? { normalizeValue } : {}),
    ...(labelFor ? { labelFor } : {}),
    ...(includeAny ? { includeAny } : {}),
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

const categoryDataUrls = import.meta.glob<string>('../../data/generated/*.json', {
  eager: true,
  query: '?url',
  import: 'default',
});

function loader<T>(categoryId: string, offload = false): () => Promise<T[]> {
  return async () => {
    const suffix = `/generated/${categoryId}.json`;
    const url = Object.entries(categoryDataUrls).find(([path]) =>
      path.endsWith(suffix),
    )![1];
    try {
      const file = await loadJson<CompendiumFile<T>>(url, offload);
      return file.items;
    } catch {
      throw new Error(`Failed to load compendium data: ${categoryId}`);
    }
  };
}

export const categories: CompendiumCategory[] = [
  {
    id: 'species',
    label: 'Species',
    load: loader<SpeciesEntry>('species'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue((item as SpeciesEntry).size, locale, 'objectSize') ?? '',
    renderDetail: (item) => <SpeciesDetail species={item as SpeciesEntry} />,
  },
  {
    id: 'classes',
    label: 'Classes',
    load: loader<ClassEntry>('classes'),
    subtitle: (item, t) =>
      t('compendium.detail.hitDieValue', { die: (item as ClassEntry).hitDie }),
    renderDetail: (item) => {
      const cls = item as ClassEntry & { _fumbleSelectedSubclassId?: string };
      return (
        <ClassDetail
          cls={cls}
          {...(cls._fumbleSelectedSubclassId
            ? { selectedSubclassId: cls._fumbleSelectedSubclassId }
            : {})}
        />
      );
    },
  },
  {
    id: 'backgrounds',
    label: 'Backgrounds',
    load: loader<BackgroundEntry>('backgrounds'),
    subtitle: (item, t) =>
      (item as BackgroundEntry).feat || t('compendium.detail.background'),
    renderDetail: (item) => <BackgroundDetail background={item as BackgroundEntry} />,
  },
  {
    id: 'feats',
    label: 'Feats',
    load: loader<FeatEntry>('feats'),
    subtitle: (item, t, locale = 'en') =>
      t('compendium.detail.featCategory', {
        category:
          localizeCompendiumValue((item as FeatEntry).category, locale, 'featCategory') ??
          (item as FeatEntry).category,
      }),
    renderDetail: (item) => <FeatDetail feat={item as FeatEntry} />,
  },
  {
    id: 'optionalfeatures',
    label: 'Options & Features',
    load: loader<OptionalFeatureEntry>('optionalfeatures'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue(
        (item as OptionalFeatureEntry).featureType,
        locale,
        'featureType',
      ) ?? '',
    renderDetail: (item) => (
      <OptionalFeatureDetail feature={item as OptionalFeatureEntry} />
    ),
  },
  {
    id: 'spells',
    label: 'Spells',
    load: loader<SpellEntry>('spells'),
    subtitle: (item, t, locale = 'en') => {
      const spell = item as SpellEntry;
      const school =
        localizeCompendiumValue(spell.school, locale, 'school') ?? spell.school;
      return `${spellLevel(spell.level, t)} · ${school}`;
    },
    renderDetail: (item) => <SpellDetail spell={item as SpellEntry} />,
  },
  {
    id: 'items',
    label: 'Items',
    load: loader<ItemEntry>('items'),
    subtitle: (item, _, locale = 'en') => {
      const it = item as ItemEntry;
      return [itemTypeLabel(it.type, locale), itemRarityLabel(it.rarity, locale)]
        .filter(Boolean)
        .join(' · ');
    },
    renderDetail: (item) => <ItemDetail item={item as ItemEntry} />,
  },
  {
    id: 'firearms',
    label: 'Firearms',
    load: async () => [],
    subtitle: (item, _, locale = 'en') => {
      const it = item as ItemEntry;
      return [itemTypeLabel(it.type, locale), itemRarityLabel(it.rarity, locale)]
        .filter(Boolean)
        .join(' · ');
    },
    renderDetail: (item) => <ItemDetail item={item as ItemEntry} />,
  },
  {
    id: 'bestiary',
    label: 'Bestiary',
    load: loader<MonsterEntry>('bestiary', true),
    subtitle: (item, t, locale = 'en') => {
      const m = item as MonsterEntry;
      const localizedSize = localizeCompendiumValue(m.size, locale, 'objectSize');
      const localizedCreatureType =
        localizeCompendiumValue(m.creatureType, locale, 'creatureType') ?? m.creatureType;
      const size = localizedSize
        ? agreeSize(localizedSize, localizedCreatureType)
        : localizedSize;
      return `${t('compendium.detail.crValue', { cr: m.cr })} · ${[size, localizedCreatureType].filter(Boolean).join(' ')}`;
    },
    renderDetail: (item) => <MonsterDetail monster={item as MonsterEntry} />,
  },
  {
    id: 'actions',
    label: 'Actions',
    load: loader<ActionEntry>('actions'),
    subtitle: (item, t) => (item as ActionEntry).time || t('compendium.detail.action'),
    renderDetail: (item) => <ActionDetail action={item as ActionEntry} />,
  },
  {
    id: 'conditions',
    label: 'Conditions',
    load: loader<ConditionEntry>('conditions'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue((item as ConditionEntry).kind, locale, 'conditionKind') ??
      '',
    renderDetail: (item) => <ConditionDetail condition={item as ConditionEntry} />,
  },
  {
    id: 'rules',
    label: 'Rules',
    load: loader<RuleEntry>('rules'),
    subtitle: (item, t, locale = 'en') =>
      t('compendium.detail.ruleType', {
        type:
          localizeCompendiumValue((item as RuleEntry).ruleType, locale, 'ruleType') ??
          (item as RuleEntry).ruleType,
      }),
    renderDetail: (item) => <RuleDetail rule={item as RuleEntry} />,
  },
  {
    id: 'deities',
    label: 'Deities',
    load: loader<DeityEntry>('deities'),
    subtitle: (item, t, locale = 'en') =>
      localizeCompendiumValue((item as DeityEntry).pantheon, locale, 'pantheon') ??
      t('compendium.detail.deity'),
    renderDetail: (item) => <DeityDetail deity={item as DeityEntry} />,
  },
  {
    id: 'hazards',
    label: 'Hazards',
    load: loader<HazardEntry>('hazards'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue((item as HazardEntry).hazardType, locale, 'hazardType') ??
      '',
    renderDetail: (item) => <HazardDetail hazard={item as HazardEntry} />,
  },
  {
    id: 'boons',
    label: 'Boons',
    load: loader<BoonEntry>('boons'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue((item as BoonEntry).boonType, locale, 'boonType') ?? '',
    renderDetail: (item) => <BoonDetail boon={item as BoonEntry} />,
  },
  {
    id: 'skills',
    label: 'Skills',
    load: loader<SkillEntry>('skills'),
    subtitle: (item, t, locale = 'en') =>
      localizeCompendiumValue((item as SkillEntry).ability, locale, 'ability') ??
      t('compendium.detail.skill'),
    renderDetail: (item) => <SkillDetail skill={item as SkillEntry} />,
  },
  {
    id: 'senses',
    label: 'Senses',
    load: loader<SenseEntry>('senses'),
    subtitle: (_, t) => t('compendium.detail.sense'),
    renderDetail: (item) => <SenseDetail sense={item as SenseEntry} />,
  },
  {
    id: 'languages',
    label: 'Languages',
    load: loader<LanguageEntry>('languages'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue(
        (item as LanguageEntry).languageType,
        locale,
        'languageType',
      ) ?? '',
    renderDetail: (item) => <LanguageDetail language={item as LanguageEntry} />,
  },
  {
    id: 'cultsboons',
    label: 'Cults & Boons',
    load: loader<CultBoonEntry>('cultsboons'),
    subtitle: (item, _, locale = 'en') => {
      const cb = item as CultBoonEntry;
      return [
        localizeCompendiumValue(cb.category, locale, 'cultBoonCategory'),
        localizeCompendiumValue(cb.kind, locale, 'cultBoonKind'),
      ]
        .filter(Boolean)
        .join(' ');
    },
    renderDetail: (item) => <CultBoonDetail cultBoon={item as CultBoonEntry} />,
  },
  {
    id: 'facilities',
    label: 'Bastions',
    load: loader<FacilityEntry>('facilities'),
    subtitle: (item, t, locale = 'en') => {
      const f = item as FacilityEntry;
      return [
        localizeCompendiumValue(f.facilityType, locale, 'facilityType'),
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
    load: loader<RecipeEntry>('recipes'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue((item as RecipeEntry).recipeType, locale, 'recipeType') ??
      '',
    renderDetail: (item) => <RecipeDetail recipe={item as RecipeEntry} />,
  },
  {
    id: 'objects',
    label: 'Objects',
    load: loader<ObjectEntry>('objects'),
    subtitle: (item, _, locale = 'en') => {
      const o = item as ObjectEntry;
      return [
        localizeCompendiumValue(o.size, locale, 'objectSize'),
        localizeCompendiumValue(o.objectType, locale, 'objectType'),
      ]
        .filter(Boolean)
        .join(' ');
    },
    renderDetail: (item) => <ObjectDetail object={item as ObjectEntry} />,
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    load: loader<VehicleEntry>('vehicles'),
    subtitle: (item, _, locale = 'en') => {
      const v = item as VehicleEntry;
      return [
        localizeCompendiumValue(v.size, locale, 'objectSize'),
        localizeCompendiumValue(v.vehicleType, locale, 'vehicleType'),
      ]
        .filter(Boolean)
        .join(' ');
    },
    renderDetail: (item) => <VehicleDetail vehicle={item as VehicleEntry} />,
  },
  {
    id: 'masteries',
    label: 'Weapon Masteries',
    load: loader<MasteryEntry>('masteries'),
    subtitle: (_, t) => t('compendium.detail.weaponMastery'),
    renderDetail: (item) => <MasteryDetail mastery={item as MasteryEntry} />,
  },
  {
    id: 'charoptions',
    label: 'Character Options',
    load: loader<CharOptionEntry>('charoptions'),
    subtitle: (item, _, locale = 'en') =>
      localizeCompendiumValue(
        (item as CharOptionEntry).optionType,
        locale,
        'optionType',
      ) ?? '',
    renderDetail: (item) => <CharOptionDetail option={item as CharOptionEntry} />,
  },
  {
    id: 'tables',
    label: 'Tables',
    load: loader<TableEntry>('tables'),
    subtitle: (_, t) => t('compendium.detail.table'),
    renderDetail: (item) => <TableDetail table={item as TableEntry} />,
  },
  {
    id: 'decks',
    label: 'Decks',
    load: loader<DeckEntry>('decks'),
    subtitle: (item, t) =>
      t('compendium.detail.deckCardsShort', { count: (item as DeckEntry).cardCount }),
    renderDetail: (item) => <DeckDetail deck={item as DeckEntry} />,
  },
  {
    id: 'psionics',
    label: 'Psionics',
    load: loader<SourceDataEntry>('psionics'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'encounters',
    label: 'Encounters',
    load: loader<SourceDataEntry>('encounters'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'loot',
    label: 'Loot Tables',
    load: loader<SourceDataEntry>('loot'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'life',
    label: 'Life Tables',
    load: loader<SourceDataEntry>('life'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'names',
    label: 'Names',
    load: loader<SourceDataEntry>('names'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'monsterfeatures',
    label: 'Monster Features',
    load: loader<SourceDataEntry>('monsterfeatures'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
  {
    id: 'homecrafts',
    label: 'Homecrafts',
    load: loader<SourceDataEntry>('homecrafts'),
    subtitle: (item, t) =>
      t(`compendium.sourceData.collections.${(item as SourceDataEntry).collection}`),
    renderDetail: (item) => <SourceDataDetail entry={item as SourceDataEntry} />,
  },
];

function filterLabel(key: string): string {
  return `compendium.filters.labels.${key}`;
}

const FILTER_VALUE_LABEL_KEYS: Record<string, string> = {
  class: 'compendium.filters.values.class',
  sidekick: 'compendium.filters.values.sidekick',
  'Fighting Style': 'compendium.filters.values.fightingStyle',
  'Styl walki': 'compendium.filters.values.fightingStyle',
};

function filterValueLabelKey(value: string): string | undefined {
  return FILTER_VALUE_LABEL_KEYS[value];
}

function isSidekickClass(item: CompendiumEntryBase): boolean {
  return (item.id ?? '').endsWith('-sidekick');
}

function isFightingStyle(item: CompendiumEntryBase): boolean {
  const featureType = (item as OptionalFeatureEntry).featureType ?? '';
  return featureType
    .split(', ')
    .some((value) => value === 'Fighting Style' || value === 'Styl walki');
}

const FILTERS_BY_ID: Partial<Record<CompendiumCategoryId, CategoryFilter[]>> = {
  classes: [
    {
      id: 'type',
      label: filterLabel('type'),
      valuesFor: (item) => [isSidekickClass(item) ? 'sidekick' : 'class'],
      defaultVisible: (item) => !isSidekickClass(item),
      valueLabelKey: filterValueLabelKey,
    },
  ],
  species: [
    field<SpeciesEntry>(
      'size',
      filterLabel('size'),
      (i) => i.size,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'objectSize') ?? value,
    ),
    field<SpeciesEntry>(
      'creatureType',
      filterLabel('creatureType'),
      (i) => i.creatureType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'creatureType') ?? value,
    ),
  ],
  feats: [
    field<FeatEntry>(
      'category',
      filterLabel('category'),
      (i) => i.category,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'featCategory') ?? value,
    ),
  ],
  spells: [
    {
      id: 'class',
      label: filterLabel('class'),
      valuesFor: (i) => [
        ...new Set((i as SpellEntry).classes?.map(canonicalClassFilterValue) ?? []),
      ],
      normalizeValue: canonicalClassFilterValue,
      labelFor: (value, locale) => classFilterLabel(value, locale ?? 'en'),
    },
    {
      id: 'subclass',
      label: filterLabel('subclass'),
      valuesFor: (i) => (i as SpellEntry).subclasses?.map((value) => String(value)) ?? [],
    },
    {
      id: 'level',
      label: filterLabel('level'),
      valuesFor: (i) => {
        const level = (i as SpellEntry).level;
        return [level === 0 ? 'Cantrip' : `Level ${level}`];
      },
      sortKey: (v) => (v === 'Cantrip' ? 0 : Number(v.replace('Level ', ''))),
    },
    field<SpellEntry>(
      'school',
      filterLabel('school'),
      (i) => i.school,
      canonicalSpellSchool,
      spellSchoolLabel,
    ),
    presenceField<SpellEntry>(
      'concentration',
      filterLabel('concentration'),
      (i) => i.concentration,
    ),
    presenceField<SpellEntry>('ritual', filterLabel('ritual'), (i) => i.ritual),
  ],
  items: [
    field<ItemEntry>(
      'type',
      filterLabel('type'),
      (i) => i.type,
      canonicalItemType,
      itemTypeLabel,
    ),
    field<ItemEntry>(
      'rarity',
      filterLabel('rarity'),
      (i) => i.rarity,
      canonicalItemRarity,
      itemRarityLabel,
    ),
    presenceField<ItemEntry>(
      'attunement',
      filterLabel('attunement'),
      (i) => i.attunement,
    ),
    splitField<ItemEntry>(
      'properties',
      filterLabel('properties'),
      (i) => i.properties,
      ',',
      canonicalItemProperty,
      itemPropertyLabel,
    ),
  ],
  bestiary: [
    {
      id: 'cr',
      label: filterLabel('cr'),
      valuesFor: (i) => [(i as MonsterEntry).cr],
      sortKey: (v) => XP_BY_CR[v] ?? -1,
    },
    field<MonsterEntry>(
      'type',
      filterLabel('type'),
      (i) => (i.creatureType ?? '').replace(/\s*\(.*\)$/, ''),
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'creatureType') ?? value,
    ),
    field<MonsterEntry>(
      'size',
      filterLabel('size'),
      (i) => i.size,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'objectSize') ?? value,
    ),
    field<MonsterEntry>(
      'alignment',
      filterLabel('alignment'),
      (i) => i.alignment,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'alignment') ?? value,
    ),
    splitField<MonsterEntry>(
      'habitat',
      filterLabel('habitat'),
      (i) => i._englishHabitat ?? i.habitat,
      ',',
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'habitat') ?? value,
      true,
    ),

    splitField<MonsterEntry>(
      'resistances',
      filterLabel('resistances'),
      (i) => i.resistances,
      ';',
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'damageType') ?? value,
    ),
    splitField<MonsterEntry>(
      'immunities',
      filterLabel('immunities'),
      (i) => i.immunities,
      ';',
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'damageType') ?? value,
    ),
    splitField<MonsterEntry>(
      'conditionImmunities',
      filterLabel('conditionImmunities'),
      (i) => i.conditionImmunities,
      ';',
    ),
    splitField<MonsterEntry>('languages', filterLabel('languages'), (i) => i.languages),
  ],
  conditions: [
    field<ConditionEntry>(
      'kind',
      filterLabel('kind'),
      (i) => i.kind,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'conditionKind') ?? value,
    ),
  ],
  optionalfeatures: [
    {
      id: 'featureType',
      label: filterLabel('type'),
      valuesFor: (i) =>
        ((i as OptionalFeatureEntry).featureType ?? '').split(', ').filter(Boolean),
      defaultVisible: (item) => !isFightingStyle(item),
      valueLabelKey: filterValueLabelKey,
      labelFor: (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'featureType') ?? value,
    },
  ],
  rules: [
    field<RuleEntry>(
      'ruleType',
      filterLabel('type'),
      (i) => i.ruleType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'ruleType') ?? value,
    ),
  ],
  deities: [
    field<DeityEntry>(
      'pantheon',
      filterLabel('pantheon'),
      (i) => i.pantheon,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'pantheon') ?? value,
    ),
  ],
  hazards: [
    field<HazardEntry>(
      'hazardType',
      filterLabel('type'),
      (i) => i.hazardType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'hazardType') ?? value,
    ),
  ],
  boons: [
    field<BoonEntry>(
      'boonType',
      filterLabel('type'),
      (i) => i.boonType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'boonType') ?? value,
    ),
  ],
  skills: [
    field<SkillEntry>(
      'ability',
      filterLabel('ability'),
      (i) => i.ability,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'ability') ?? value,
    ),
  ],
  languages: [
    field<LanguageEntry>(
      'languageType',
      filterLabel('type'),
      (i) => i.languageType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'languageType') ?? value,
    ),
  ],
  cultsboons: [
    field<CultBoonEntry>(
      'kind',
      filterLabel('kind'),
      (i) => i.kind,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'cultBoonKind') ?? value,
    ),
    field<CultBoonEntry>(
      'category',
      filterLabel('category'),
      (i) => i.category,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'cultBoonCategory') ?? value,
    ),
  ],
  facilities: [
    field<FacilityEntry>(
      'facilityType',
      filterLabel('type'),
      (i) => i.facilityType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'facilityType') ?? value,
    ),
  ],
  recipes: [
    field<RecipeEntry>(
      'recipeType',
      filterLabel('type'),
      (i) => i.recipeType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'recipeType') ?? value,
    ),
  ],
  objects: [
    field<ObjectEntry>(
      'objectType',
      filterLabel('type'),
      (i) => i.objectType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'objectType') ?? value,
    ),
  ],
  vehicles: [
    field<VehicleEntry>(
      'vehicleType',
      filterLabel('type'),
      (i) => i.vehicleType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'vehicleType') ?? value,
    ),
  ],
  charoptions: [
    field<CharOptionEntry>(
      'optionType',
      filterLabel('type'),
      (i) => i.optionType,
      undefined,
      (value, locale) =>
        localizeCompendiumValue(value, locale ?? 'en', 'optionType') ?? value,
    ),
  ],
};

for (const category of categories) {
  category.filters = [
    ...(FILTERS_BY_ID[category.id] ??
      (category.id === 'firearms' ? FILTERS_BY_ID.items! : [])),
    sourceFilter,
  ];
}

export function getCategory(id: string | undefined): CompendiumCategory | undefined {
  return categories.find((category) => category.id === id);
}
