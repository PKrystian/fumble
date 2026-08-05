import { translate } from '../../i18n/translate';
import type { Locale } from '../../i18n/locales';
import type { CompendiumEntryBase } from './types';

export interface CompendiumSeo {
  title: string;
  description: string;
}

interface CompendiumEntrySeoInput {
  categoryId: string;
  categoryLabel: string;
  item: CompendiumEntryBase;
  locale: Locale;
  sourceLabel: string;
  displayName?: string;
}

interface DetailSpec {
  key: string;
  labelKey: string;
}

const CATEGORY_DETAIL_FIELDS: Record<string, readonly DetailSpec[]> = {
  actions: [{ key: 'time', labelKey: 'compendium.seo.details.time' }],
  backgrounds: [
    { key: 'abilityScores', labelKey: 'compendium.seo.details.abilityScores' },
    { key: 'skills', labelKey: 'compendium.seo.details.skills' },
    { key: 'tools', labelKey: 'compendium.seo.details.tools' },
    { key: 'feat', labelKey: 'compendium.seo.details.feat' },
  ],
  bestiary: [
    { key: 'cr', labelKey: 'compendium.seo.details.challengeRating' },
    { key: 'creatureType', labelKey: 'compendium.seo.details.creatureType' },
    { key: 'size', labelKey: 'compendium.seo.details.size' },
    { key: 'speed', labelKey: 'compendium.seo.details.speed' },
  ],
  boons: [{ key: 'boonType', labelKey: 'compendium.seo.details.boonType' }],
  charoptions: [
    { key: 'optionType', labelKey: 'compendium.seo.details.optionType' },
    { key: 'prerequisite', labelKey: 'compendium.seo.details.prerequisite' },
  ],
  classes: [
    { key: 'hitDie', labelKey: 'compendium.seo.details.hitDie' },
    { key: 'primaryAbility', labelKey: 'compendium.seo.details.primaryAbility' },
    { key: 'savingThrows', labelKey: 'compendium.seo.details.savingThrows' },
  ],
  conditions: [{ key: 'kind', labelKey: 'compendium.seo.details.kind' }],
  cultsboons: [
    { key: 'category', labelKey: 'compendium.seo.details.category' },
    { key: 'kind', labelKey: 'compendium.seo.details.kind' },
  ],
  deities: [
    { key: 'pantheon', labelKey: 'compendium.seo.details.pantheon' },
    { key: 'domains', labelKey: 'compendium.seo.details.domains' },
  ],
  decks: [{ key: 'cardCount', labelKey: 'compendium.seo.details.cardCount' }],
  encounters: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  facilities: [
    { key: 'facilityType', labelKey: 'compendium.seo.details.facilityType' },
    { key: 'level', labelKey: 'compendium.seo.details.level' },
    { key: 'space', labelKey: 'compendium.seo.details.space' },
    { key: 'orders', labelKey: 'compendium.seo.details.orders' },
  ],
  feats: [
    { key: 'category', labelKey: 'compendium.seo.details.category' },
    { key: 'prerequisite', labelKey: 'compendium.seo.details.prerequisite' },
  ],
  hazards: [{ key: 'hazardType', labelKey: 'compendium.seo.details.hazardType' }],
  homecrafts: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  items: [
    { key: 'type', labelKey: 'compendium.seo.details.itemType' },
    { key: 'rarity', labelKey: 'compendium.seo.details.rarity' },
    { key: 'attunement', labelKey: 'compendium.seo.details.attunement' },
    { key: 'properties', labelKey: 'compendium.seo.details.properties' },
    { key: 'damage', labelKey: 'compendium.seo.details.damage' },
    { key: 'ac', labelKey: 'compendium.seo.details.armorClass' },
  ],
  languages: [
    { key: 'languageType', labelKey: 'compendium.seo.details.languageType' },
    { key: 'script', labelKey: 'compendium.seo.details.script' },
    { key: 'typicalSpeakers', labelKey: 'compendium.seo.details.typicalSpeakers' },
  ],
  life: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  loot: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  masteries: [],
  monsterfeatures: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  names: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  objects: [
    { key: 'size', labelKey: 'compendium.seo.details.size' },
    { key: 'objectType', labelKey: 'compendium.seo.details.objectType' },
    { key: 'ac', labelKey: 'compendium.seo.details.armorClass' },
    { key: 'hp', labelKey: 'compendium.seo.details.hitPoints' },
  ],
  optionalfeatures: [
    { key: 'featureType', labelKey: 'compendium.seo.details.featureType' },
    { key: 'prerequisite', labelKey: 'compendium.seo.details.prerequisite' },
  ],
  psionics: [{ key: 'collection', labelKey: 'compendium.seo.details.collection' }],
  recipes: [
    { key: 'recipeType', labelKey: 'compendium.seo.details.recipeType' },
    { key: 'serves', labelKey: 'compendium.seo.details.serves' },
    { key: 'diet', labelKey: 'compendium.seo.details.diet' },
  ],
  rules: [{ key: 'ruleType', labelKey: 'compendium.seo.details.ruleType' }],
  senses: [],
  skills: [{ key: 'ability', labelKey: 'compendium.seo.details.ability' }],
  spells: [
    { key: 'level', labelKey: 'compendium.seo.details.level' },
    { key: 'school', labelKey: 'compendium.seo.details.school' },
    { key: 'castingTime', labelKey: 'compendium.seo.details.castingTime' },
    { key: 'range', labelKey: 'compendium.seo.details.range' },
    { key: 'duration', labelKey: 'compendium.seo.details.duration' },
    { key: 'concentration', labelKey: 'compendium.seo.details.concentration' },
    { key: 'ritual', labelKey: 'compendium.seo.details.ritual' },
  ],
  species: [
    { key: 'creatureType', labelKey: 'compendium.seo.details.creatureType' },
    { key: 'size', labelKey: 'compendium.seo.details.size' },
    { key: 'speed', labelKey: 'compendium.seo.details.speed' },
  ],
  tables: [{ key: 'caption', labelKey: 'compendium.seo.details.caption' }],
  vehicles: [
    { key: 'size', labelKey: 'compendium.seo.details.size' },
    { key: 'vehicleType', labelKey: 'compendium.seo.details.vehicleType' },
    { key: 'speed', labelKey: 'compendium.seo.details.speed' },
    { key: 'capacity', labelKey: 'compendium.seo.details.capacity' },
  ],
};

function clipDescription(value: string): string {
  const text = value.trim();
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}

function translated(locale: Locale, key: string): string {
  const value = translate(locale, key);
  return value === key ? '' : value;
}

function valueText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ');
  return '';
}

function entryDetails(
  categoryId: string,
  item: CompendiumEntryBase,
  locale: Locale,
): string {
  const record = item as unknown as Record<string, unknown>;
  return (CATEGORY_DETAIL_FIELDS[categoryId] ?? [])
    .map((field) => {
      const value = record[field.key];
      if (value === true) return translated(locale, field.labelKey);
      const text = valueText(value);
      return text ? translated(locale, field.labelKey).replace('{{value}}', text) : '';
    })
    .filter(Boolean)
    .join(', ');
}

export function getCompendiumCategorySeo(
  categoryId: string,
  categoryLabel: string,
  locale: Locale,
): CompendiumSeo {
  const descriptionKey = `compendium.seo.categoryDescriptions.${categoryId}`;
  const description =
    translated(locale, descriptionKey) ||
    translate(locale, 'compendium.seo.categoryDescriptionFallback', {
      category: categoryLabel.toLocaleLowerCase(locale),
    });
  return {
    title: translate(locale, 'compendium.seo.categoryTitle', { category: categoryLabel }),
    description,
  };
}

export function getCompendiumEntrySeo({
  categoryId,
  categoryLabel,
  item,
  locale,
  sourceLabel,
  displayName,
}: CompendiumEntrySeoInput): CompendiumSeo {
  const name = displayName ?? item.name;
  const type =
    translated(locale, `compendium.seo.categoryTypes.${categoryId}`) ||
    categoryLabel.toLocaleLowerCase(locale);
  const source = sourceLabel || item.source;
  const details =
    entryDetails(categoryId, item, locale) ||
    translate(locale, 'compendium.seo.entryDetailsFallback');
  return {
    title: translate(locale, 'compendium.seo.entryTitle', {
      name,
      type,
      source: item.source,
    }),
    description: clipDescription(
      translate(locale, 'compendium.seo.entryDescription', {
        name,
        type,
        details,
        source,
      }),
    ),
  };
}
