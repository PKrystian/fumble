import type { Entry } from '@/data/compendium/entry';
import type {
  ClassFeature,
  ClassSubclass,
  CompendiumCategoryId,
} from '@/data/compendium/types';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown): value is string => typeof value === 'string';
const texts = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text);
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

const descriptionFields = [
  'entries',
  'items',
  'tables',
  'blocks',
  'attackEntries',
  'hitEntries',
  'images',
  'row',
];

export function isHomebrewDescription(value: unknown, depth = 0): value is Entry {
  if (text(value)) return true;
  if (depth >= 64 || !record(value) || !text(value.type)) return false;
  const child = (node: unknown) => isHomebrewDescription(node, depth + 1);
  if (
    !['name', 'caption', 'title', 'text'].every(
      (key) => value[key] === undefined || text(value[key]),
    )
  )
    return false;
  if (
    !descriptionFields.every(
      (key) =>
        value[key] === undefined ||
        (Array.isArray(value[key]) && value[key].every(child)),
    )
  )
    return false;
  if (value.entry !== undefined && !child(value.entry)) return false;
  if (value.colLabels !== undefined && !texts(value.colLabels)) return false;
  if (
    value.rows !== undefined &&
    (!Array.isArray(value.rows) ||
      !value.rows.every((row) => (Array.isArray(row) ? row.every(child) : child(row))))
  )
    return false;
  return (
    value.href === undefined ||
    text(value.href) ||
    (record(value.href) &&
      (value.href.path === undefined || text(value.href.path)) &&
      (value.href.url === undefined || text(value.href.url)))
  );
}

const descriptions = (value: unknown) =>
  Array.isArray(value) && value.every((entry) => isHomebrewDescription(entry));

const namedSection = (value: unknown) =>
  record(value) && text(value.name) && descriptions(value.entries);
const sections = (value: unknown) => Array.isArray(value) && value.every(namedSection);

export function isHomebrewFeature(value: unknown): value is ClassFeature {
  return record(value) && number(value.level) && namedSection(value);
}

const features = (value: unknown) =>
  Array.isArray(value) && value.every(isHomebrewFeature);

function gallery(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        record(item) &&
        text(item.path) &&
        (item.title === undefined || text(item.title)) &&
        (item.credit === undefined || text(item.credit)),
    )
  );
}

export function isRenderableSubclass(value: unknown): value is ClassSubclass {
  return (
    record(value) &&
    text(value.name) &&
    value.name.trim().length > 0 &&
    text(value.source) &&
    features(value.features) &&
    ['id', 'englishName', 'image'].every(
      (field) => value[field] === undefined || text(value[field]),
    ) &&
    (value.lore === undefined || descriptions(value.lore)) &&
    (value.gallery === undefined || gallery(value.gallery))
  );
}

const textFields = {
  spells: 'school castingTime range components duration',
  firearms:
    'type rarity attunement weight value damage ac properties range weaponCategory mastery',
  items:
    'type rarity attunement weight value damage ac properties range weaponCategory mastery',
  conditions: 'kind',
  species: 'size speed creatureType parentRace',
  feats: 'category prerequisite',
  backgrounds: 'abilityScores skills tools feat',
  rules: 'ruleType',
  classes:
    'hitDie primaryAbility savingThrows proficiencies armorProficiencies weaponProficiencies toolProficiencies subclassTitle',
  bestiary:
    'size creatureType alignment ac initiative hp speed saves skills vulnerabilities resistances immunities conditionImmunities senses languages cr crDisplay habitat _englishHabitat treasure legendaryIntro',
  actions: 'time',
  optionalfeatures: 'featureType prerequisite',
  deities: 'pantheon alignment domains symbol',
  hazards: 'hazardType',
  boons: 'boonType',
  skills: 'ability',
  languages: 'languageType script typicalSpeakers',
  cultsboons: 'kind category',
  facilities: 'facilityType level prerequisite space orders',
  recipes: 'recipeType serves diet',
  objects: 'size objectType ac hp immune senses',
  vehicles: 'vehicleType size dimensions terrain capacity pace speed cost ac hp immune',
  charoptions: 'optionType prerequisite',
  tables: 'caption',
} satisfies Partial<Record<CompendiumCategoryId, string>>;

const categoryTextFields: Partial<Record<CompendiumCategoryId, string[]>> =
  Object.fromEntries(
    Object.entries(textFields).map(([category, fields]) => [category, fields.split(' ')]),
  );

const numberFields: Partial<Record<CompendiumCategoryId, string[]>> = {
  spells: ['level'],
  species: ['walkSpeed', 'flySpeed', 'swimSpeed', 'climbSpeed'],
  bestiary: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  objects: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  decks: ['cardCount'],
};

const monsterSections = [
  'traits',
  'spellcasting',
  'actions',
  'bonusActions',
  'reactions',
  'legendaryActions',
];

function hasSupportedDepth(value: unknown, depth = 0): boolean {
  if (value === null || typeof value !== 'object') return true;
  if (depth >= 64) return false;
  return Object.values(value).every((child) => hasSupportedDepth(child, depth + 1));
}

export function canRenderHomebrew(category: CompendiumCategoryId, value: unknown) {
  if (!record(value) || !text(value.name) || !value.name.trim()) return false;
  if (!hasSupportedDepth(value)) return false;
  if (value.source != null && !text(value.source)) return false;
  const fields = [
    'englishName',
    'image',
    'token',
    ...(categoryTextFields[category] ?? []),
  ];
  if (!fields.every((key) => value[key] === undefined || text(value[key]))) return false;
  if (
    !['page', ...(numberFields[category] ?? [])].every(
      (key) => value[key] === undefined || number(value[key]),
    )
  )
    return false;
  if (
    ![
      'entries',
      'entriesHigherLevel',
      'intro',
      'lore',
      'lairActions',
      'regionalEffects',
    ].every((key) => value[key] === undefined || descriptions(value[key]))
  )
    return false;
  if (
    !['propertyRefs', 'masteryRefs', '_englishClasses', '_englishSubclasses'].every(
      (key) => value[key] === undefined || texts(value[key]),
    )
  )
    return false;
  if (value.gallery !== undefined && !gallery(value.gallery)) return false;
  if (
    value.otherVersions !== undefined &&
    (!Array.isArray(value.otherVersions) ||
      !value.otherVersions.every(
        (version) => record(version) && text(version.id) && text(version.source),
      ))
  )
    return false;
  if (value._filterData !== undefined && !record(value._filterData)) return false;

  switch (category) {
    case 'spells':
      return (
        ['classes', 'subclasses'].every(
          (key) => value[key] === undefined || texts(value[key]),
        ) &&
        ['ritual', 'concentration'].every(
          (key) => value[key] === undefined || typeof value[key] === 'boolean',
        )
      );
    case 'classes':
      return (
        record(value.table) &&
        texts(value.table.headers) &&
        Array.isArray(value.table.rows) &&
        value.table.rows.every(texts) &&
        features(value.features) &&
        Array.isArray(value.subclasses) &&
        value.subclasses.every(isRenderableSubclass)
      );
    case 'bestiary':
      return (
        monsterSections.every((key) => sections(value[key])) &&
        text(value.cr) &&
        number(value.str)
      );
    case 'objects':
      return sections(value.actions);
    case 'vehicles':
      return sections(value.weapons);
    case 'tables':
      return (
        texts(value.colLabels) &&
        Array.isArray(value.rows) &&
        value.rows.every(descriptions)
      );
    case 'psionics':
    case 'encounters':
    case 'loot':
    case 'life':
    case 'names':
    case 'monsterfeatures':
    case 'homecrafts':
      return text(value.collection) && record(value.data);
    default:
      return true;
  }
}
