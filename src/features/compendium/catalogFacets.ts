import languageData from '@/data/generated/languages.json';
import { localizeCompendiumValue } from '@/data/compendium/localizeValue';
import { normalizeSearchText } from '@/data/compendium/searchText';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import { translate } from '@/i18n/translate';
import { DAMAGE_TYPES } from '@/features/dice/damage';
import type { CategoryFilter, CompendiumCategory } from './categories';
import { canonicalItemRarity } from './filterValues';

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Varies'];
const CREATURE_TYPES = [
  'Aberration',
  'Beast',
  'Celestial',
  'Construct',
  'Dragon',
  'Elemental',
  'Fey',
  'Fiend',
  'Giant',
  'Humanoid',
  'Monstrosity',
  'Ooze',
  'Plant',
  'Undead',
];
const CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
];
const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
  'Varies',
  'Unknown (magic)',
];
const ABILITIES = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
];

function abilityFilter(id: string): CategoryFilter {
  return {
    id,
    label: `compendium.filters.labels.${id}`,
    valuesFor: (item) =>
      ABILITIES.filter((ability) =>
        new RegExp(`\\b${ability}\\b`, 'i').test(stringValue(item, id)),
      ),
    labelFor: (value, locale = 'en') =>
      localizeCompendiumValue(value, locale, 'ability') ?? value,
  };
}
const CODES: Record<string, string> = {
  D: 'dragonmark',
  DG: 'darkGift',
  AS: 'arcaneShot',
  ED: 'elementalDiscipline',
  RP: 'houseReputation',
  'FS:B': 'bardStyle',
  'FS:P': 'paladinStyle',
  'FS:R': 'rangerStyle',
};

function translatedLabel(locale: Locale, prefix: string, value: string): string {
  const key = `${prefix}.${value}`;
  const result = translate(locale, key);
  return result === key ? value : result;
}
const languageNames = [...new Set(languageData.items.map((item) => item.name))].sort(
  (a, b) => b.length - a.length,
);

export function sourceRecord(item: CompendiumEntryBase): Record<string, unknown> {
  return { ...item, ...item._filterData };
}

function stringValue(item: CompendiumEntryBase, key: string): string {
  const value = sourceRecord(item)[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function rarityValues(value: string): string[] {
  if (!value) return [];
  value = canonicalItemRarity(value);
  let text = value.toLowerCase();
  const found: string[] = [];
  for (const rarity of [...RARITIES].sort((a, b) => b.length - a.length)) {
    if (text.includes(rarity.toLowerCase())) {
      found.push(rarity);
      text = text.replaceAll(rarity.toLowerCase(), ' ');
    }
  }
  return found.length ? found : [value];
}

function canonical(value: string, values: readonly string[], field: string): string {
  const key = normalizeSearchText(value);
  return (
    values.find(
      (option) =>
        normalizeSearchText(option) === key ||
        normalizeSearchText(localizeCompendiumValue(option, 'pl', field) ?? option) ===
          key,
    ) ?? value.trim()
  );
}

export function canonicalSize(value: string): string {
  return canonical(value === 'V' ? 'Varies' : value, SIZES, 'objectSize');
}
export function canonicalCreatureType(value: string): string {
  return canonical(value, CREATURE_TYPES, 'creatureType');
}

export function sizeValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\s+(?:or|lub)\s+/i)
        .filter(Boolean)
        .map(canonicalSize),
    ),
  ];
}

export function damageValues(value: string): string[] {
  const text = normalizeSearchText(value);
  return DAMAGE_TYPES.filter((type) =>
    [type, translate('pl', `dice.damageTypes.${type}`)].some((alias) =>
      new RegExp(`\\b${normalizeSearchText(alias)}\\b`, 'i').test(text),
    ),
  );
}

export function conditionValues(value: string): string[] {
  const text = normalizeSearchText(value);
  return CONDITIONS.filter((condition) =>
    [
      condition,
      localizeCompendiumValue(condition, 'pl', 'conditionImmunities') ?? condition,
    ].some((alias) => new RegExp(`\\b${normalizeSearchText(alias)}\\b`, 'i').test(text)),
  );
}

export function languageValues(value: string): string[] {
  let text = normalizeSearchText(value);
  const found: string[] = [];
  if (/\b(?:all|any)\b.*\blanguages?\b/.test(text)) found.push('Any');
  for (const name of languageNames) {
    const alias = normalizeSearchText(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${alias}\\b`, 'g');
    if (pattern.test(text)) {
      found.push(name);
      text = text.replace(pattern, ' ');
    }
  }
  return found;
}

export function numericValue(
  value: string,
  quantity: 'number' | 'money' | 'weight' | 'distance' | 'time' = 'number',
): number | undefined {
  const text = value.trim().toLowerCase();
  if (quantity === 'time' && text === 'instantaneous') return 0;
  if (quantity === 'time' && text === 'until dispelled') return 1e12;
  if (quantity === 'distance') {
    if (/^self|^siebie/.test(text)) return 0;
    if (/^touch|^dotyk/.test(text)) return 1;
    if (/unlimited|nieogranicz/.test(text)) return 1e12;
  }
  const match = text.match(/(?:^|\s)(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return undefined;
  const amount = Number(match[1]!.replaceAll(',', ''));
  if (quantity === 'money') {
    const unit = /(cp|sp|ep|gp|pp)\b/.exec(text)?.[1];
    return unit
      ? amount * { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }[unit]!
      : undefined;
  }
  if (quantity === 'weight')
    return /oz\b/.test(text) ? amount / 16 : /lb\b/.test(text) ? amount : undefined;
  if (quantity === 'distance')
    return /mile/.test(text)
      ? amount * 5280
      : /feet|foot|ft\b/.test(text)
        ? amount
        : undefined;
  if (quantity === 'time') {
    if (/bonus\b/.test(text)) return 0.5;
    if (/reaction/.test(text)) return 0.25;
    if (/round/.test(text)) return amount * 6;
    if (/minute/.test(text)) return amount * 60;
    if (/hour/.test(text)) return amount * 3600;
    if (/day/.test(text)) return amount * 86400;
    return /action/.test(text) ? amount * 6 : undefined;
  }
  return amount;
}

export function codeLabel(value: string = '', locale: Locale = 'en'): string {
  return value
    .split(', ')
    .map((part) =>
      CODES[part]
        ? translate(locale, `compendium.catalog.codes.${CODES[part]}`)
        : ((localizeCompendiumValue(part, locale, 'featureType') !== part
            ? localizeCompendiumValue(part, locale, 'featureType')
            : localizeCompendiumValue(part, locale, 'featCategory')) ?? part),
    )
    .join(', ');
}

function simpleFilter(id: string, key = id, split = false, field = key): CategoryFilter {
  return {
    id,
    label: `compendium.filters.labels.${id}`,
    valuesFor: (item) => {
      const value = sourceRecord(item)[key];
      return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === 'string')
        : (typeof value === 'string' || typeof value === 'number') && value !== ''
          ? split
            ? String(value).split(/,\s*/).filter(Boolean)
            : [String(value)]
          : [];
    },
    labelFor: (value, locale = 'en') =>
      localizeCompendiumValue(value, locale, field) ?? value,
  };
}

function presence(
  id: string,
  get: (item: CompendiumEntryBase) => boolean,
): CategoryFilter {
  return {
    id,
    label: `compendium.filters.labels.${id}`,
    valuesFor: (item) => [get(item) ? 'Yes' : 'No'],
  };
}

function numberSort(
  id: string,
  field: string,
  quantity: Parameters<typeof numericValue>[1] = 'number',
): CategoryFilter {
  return {
    id,
    label: `compendium.filters.labels.${id}`,
    valuesFor: (item) => {
      const value = numericValue(stringValue(item, field), quantity);
      return value === undefined ? [] : [String(value)];
    },
    sortKey: Number,
  };
}

function movement(item: CompendiumEntryBase): string[] {
  const speed = stringValue(item, 'speed');
  return ['fly', 'swim', 'climb', 'burrow'].filter(
    (type) =>
      new RegExp(`\\b${type}\\b`, 'i').test(speed) ||
      Number(sourceRecord(item)[`${type}Speed`]) > 0,
  );
}

function sourceData(item: CompendiumEntryBase): Record<string, unknown> {
  const value = (item as CompendiumEntryBase & { data?: Record<string, unknown> }).data;
  return (item._filterData?.data as Record<string, unknown> | undefined) ?? value ?? {};
}

function hasValues(item: CompendiumEntryBase, key: string): boolean {
  const value = sourceRecord(item)[key];
  return Array.isArray(value) && value.length > 0;
}

export function dataValueLabel(value: string, field: string, locale: Locale): string {
  const order = field === 'order' ? /^(\d+)(?:st|nd|rd|th)-Order$/.exec(value) : null;
  return order
    ? translate(locale, 'compendium.catalog.psionicOrderN', { number: order[1]! })
    : translatedLabel(locale, 'compendium.catalog.dataValues', value);
}

function dataFilter(id: string, key: string): CategoryFilter {
  return {
    id,
    label: `compendium.filters.labels.${id}`,
    valuesFor: (item) => {
      const value = sourceData(item)[key];
      return typeof value === 'string' || typeof value === 'number'
        ? [String(value)]
        : [];
    },
    labelFor: (value, locale = 'en') => dataValueLabel(value, key, locale),
  };
}

export function configureCatalog(category: CompendiumCategory): void {
  const filters = (category.filters ?? []).map((filter) => {
    if (filter.id === 'size')
      return {
        ...filter,
        valuesFor: (item: CompendiumEntryBase) => sizeValues(stringValue(item, 'size')),
        normalizeValue: canonicalSize,
        sortKey: (value: string) => SIZES.indexOf(value),
      };
    if (
      filter.id === 'creatureType' ||
      (category.id === 'bestiary' && filter.id === 'type')
    )
      return { ...filter, normalizeValue: canonicalCreatureType };
    if (filter.id === 'rarity')
      return {
        ...filter,
        valuesFor: (item: CompendiumEntryBase) =>
          rarityValues(stringValue(item, 'rarity')),
        sortKey: (value: string) =>
          RARITIES.indexOf(value) < 0 ? RARITIES.length : RARITIES.indexOf(value),
      };
    if (['resistances', 'immunities', 'vulnerabilities'].includes(filter.id))
      return {
        ...filter,
        valuesFor: (item: CompendiumEntryBase) =>
          damageValues(stringValue(item, filter.id)),
        normalizeValue: (value: string) => damageValues(value)[0] ?? value,
        labelFor: (value: string, locale: Locale = 'en') =>
          translatedLabel(locale, 'dice.damageTypes', value),
        description: 'compendium.catalog.conditionalDamage',
      };
    if (filter.id === 'conditionImmunities')
      return {
        ...filter,
        valuesFor: (item: CompendiumEntryBase) =>
          conditionValues(stringValue(item, filter.id)),
        labelFor: (value: string, locale: Locale = 'en') =>
          localizeCompendiumValue(value, locale, 'conditionImmunities') ?? value,
      };
    if (category.id === 'bestiary' && filter.id === 'languages')
      return {
        ...filter,
        valuesFor: (item: CompendiumEntryBase) =>
          languageValues(stringValue(item, 'languages')),
        labelFor: (value: string, locale: Locale = 'en') =>
          value === 'Any'
            ? translate(locale, 'compendium.catalog.anyLanguage')
            : (localizeCompendiumValue(value, locale, 'languages') ?? value),
      };
    if (filter.id === 'featureType')
      return {
        ...filter,
        labelFor: codeLabel,
        description: 'compendium.catalog.featureTypeHint',
      };
    if (category.id === 'feats' && filter.id === 'category')
      return {
        ...filter,
        labelFor: (value: string, locale: Locale = 'en') =>
          CODES[value]
            ? codeLabel(value, locale)
            : (localizeCompendiumValue(value, locale, 'featCategory') ?? value),
      };
    return filter;
  });
  const extras: CategoryFilter[] = [];
  const extraSorts: CategoryFilter[] = [];
  if (['species', 'bestiary'].includes(category.id))
    extras.push({
      id: 'movement',
      label: 'compendium.filters.labels.movement',
      valuesFor: movement,
      labelFor: (value, locale = 'en') =>
        translatedLabel(locale, 'compendium.catalog.movement', value),
    });
  if (category.id === 'species') extraSorts.push(numberSort('speed', 'walkSpeed'));
  if (category.id === 'classes')
    extras.push(simpleFilter('hitDie'), abilityFilter('primaryAbility'));
  if (category.id === 'backgrounds')
    extras.push(
      simpleFilter('skills', 'skills', true),
      simpleFilter('tools', 'tools', true),
      simpleFilter('feat'),
      abilityFilter('abilityScores'),
    );
  if (['feats', 'optionalfeatures', 'facilities'].includes(category.id))
    extras.push(
      presence('prerequisite', (item) => Boolean(stringValue(item, 'prerequisite'))),
    );
  if (category.id === 'spells') {
    extras.push(
      {
        id: 'castingTime',
        label: 'compendium.filters.labels.castingTime',
        valuesFor: (item) => {
          const value = stringValue(item, 'castingTime').toLowerCase();
          if (!value) return [];
          return [
            value.includes('bonus')
              ? 'bonus'
              : value.includes('reaction')
                ? 'reaction'
                : value.includes('action')
                  ? 'action'
                  : 'long',
          ];
        },
        labelFor: (value, locale = 'en') =>
          translatedLabel(locale, 'compendium.catalog.casting', value),
      },
      {
        id: 'range',
        label: 'compendium.filters.labels.range',
        valuesFor: (item) => {
          const value = stringValue(item, 'range');
          if (!value) return [];
          return [
            /^Self/.test(value)
              ? 'self'
              : /^Touch/.test(value)
                ? 'touch'
                : /feet|mile/.test(value)
                  ? 'distance'
                  : 'special',
          ];
        },
        labelFor: (value, locale = 'en') =>
          translatedLabel(locale, 'compendium.catalog.ranges', value),
      },
      {
        id: 'components',
        label: 'compendium.filters.labels.components',
        valuesFor: (item) =>
          stringValue(item, 'components')
            .split(/,\s*/)
            .map((value) => value[0]!)
            .filter((value) => ['V', 'S', 'M'].includes(value)),
      },
    );
    extraSorts.push(
      numberSort('distance', 'range', 'distance'),
      numberSort('duration', 'duration', 'time'),
      numberSort('castingTime', 'castingTime', 'time'),
    );
  }
  if (['items', 'firearms'].includes(category.id)) {
    extras.push(simpleFilter('mastery'), simpleFilter('weaponCategory'));
    extraSorts.push(
      numberSort('value', 'value', 'money'),
      numberSort('weight', 'weight', 'weight'),
    );
  }
  if (category.id === 'bestiary') {
    extras.push(
      {
        id: 'vulnerabilities',
        label: 'compendium.filters.labels.vulnerabilities',
        valuesFor: (item) => damageValues(stringValue(item, 'vulnerabilities')),
        labelFor: (value, locale = 'en') =>
          translatedLabel(locale, 'dice.damageTypes', value),
      },
      presence('legendaryActions', (item) => hasValues(item, 'legendaryActions')),
      presence('lairActions', (item) => hasValues(item, 'lairActions')),
      presence('spellcasting', (item) => hasValues(item, 'spellcasting')),
    );
    extraSorts.push(numberSort('hp', 'hp'), numberSort('ac', 'ac'));
  }
  if (category.id === 'actions')
    extras.push(simpleFilter('time', 'time', false, 'actionTime'));
  if (category.id === 'deities')
    extras.push(simpleFilter('domains', 'domains', true), simpleFilter('alignment'));
  if (category.id === 'languages')
    extras.push(simpleFilter('script', 'script', false, 'languageScript'));
  if (category.id === 'facilities') {
    extras.push(
      simpleFilter('level'),
      simpleFilter('space'),
      simpleFilter('orders', 'orders', true),
    );
    extraSorts.push(numberSort('level', 'level'));
  }
  if (category.id === 'recipes') {
    extras.push(simpleFilter('diet'));
    extraSorts.push(numberSort('serves', 'serves'));
  }
  if (category.id === 'objects') {
    extras.push({
      ...simpleFilter('size'),
      valuesFor: (item) => sizeValues(stringValue(item, 'size')),
      normalizeValue: canonicalSize,
      labelFor: (value, locale = 'en') =>
        localizeCompendiumValue(value, locale, 'objectSize') ?? value,
      sortKey: (value) => SIZES.indexOf(value),
    });
    extraSorts.push(numberSort('ac', 'ac'), numberSort('hp', 'hp'));
  }
  if (category.id === 'vehicles') {
    extras.push(simpleFilter('terrain'));
    extraSorts.push(numberSort('cost', 'cost', 'money'), numberSort('pace', 'pace'));
  }
  if (category.id === 'decks') extraSorts.push(numberSort('cardCount', 'cardCount'));
  if (
    [
      'psionics',
      'encounters',
      'loot',
      'life',
      'names',
      'monsterfeatures',
      'homecrafts',
    ].includes(category.id)
  )
    extras.push(simpleFilter('collection'));
  if (category.id === 'psionics')
    extras.push(dataFilter('psionicType', 'type'), dataFilter('order', 'order'));
  if (category.id === 'homecrafts')
    extras.push(
      dataFilter('difficulty', 'level'),
      dataFilter('patternType', 'patternType'),
    );
  category.filters = [
    ...filters.filter((filter) => filter.id !== 'source'),
    ...extras,
    ...filters.filter((filter) => filter.id === 'source'),
  ];
  const excluded = new Set([
    'subclass',
    'class',
    'resistances',
    'immunities',
    'conditionImmunities',
    'languages',
    'movement',
    'vulnerabilities',
    'properties',
    'prerequisite',
    'spellcasting',
    'lairActions',
    'legendaryActions',
    'components',
    'abilityScores',
    'skills',
    'tools',
    'orders',
  ]);
  category.sorts = [
    ...category.filters.filter(
      (filter) =>
        !excluded.has(filter.id) && !extraSorts.some((sort) => sort.id === filter.id),
    ),
    ...extraSorts,
  ];
  const collection = category.filters.find((filter) => filter.id === 'collection');
  if (collection)
    collection.labelFor = (value, locale = 'en') =>
      translatedLabel(locale, 'compendium.sourceData.collections', value);
}
