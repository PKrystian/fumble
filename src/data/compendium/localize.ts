import type {
  ClassEntry,
  ClassSubclass,
  CompendiumEntryBase,
  MonsterEntry,
  SpellEntry,
} from './types';
import { localizeCompendiumValue, repairLocalizedMeasurements } from './localizeValue';
import type { Locale } from '../../i18n/locales';

export type EntryOverlay = Record<string, unknown>;
export type CategoryOverlay = Record<string, EntryOverlay>;

const METADATA_FIELDS = new Set([
  'ac',
  'attackBonus',
  'capacity',
  'castingTime',
  'components',
  'cost',
  'cr',
  'crDisplay',
  'damage',
  'duration',
  'height',
  'hp',
  'initiative',
  'languages',
  'long',
  'normal',
  'pace',
  'range',
  'saves',
  'senses',
  'skills',
  'speed',
  'value',
  'weight',
  'width',
]);

function numericSignature(value: string): string {
  return [...value.matchAll(/\d[\d.,]*/gu)]
    .map(([token]) => token.replace(/[.,]/gu, ''))
    .join('|');
}

function hasIncorrectSpeedLabels(source: string, localized: string): boolean {
  if (!/\b(?:Climb|Fly|Swim|Burrow|hover)\b/iu.test(source)) return false;
  return (
    /\b(?:lataj|latać|przepłyń|przepłyn|przelecieć|wspinaj|wznieś|wznieść)\b/iu.test(
      localized,
    ) ||
    (/\bhover\b/iu.test(source) && !/\bzawis/iu.test(localized))
  );
}

function repairLocalizedMetadata<T extends CompendiumEntryBase>(
  entry: T,
  translation: EntryOverlay,
  localized: T,
  locale: Locale,
): T {
  if (locale !== 'pl') return localized;
  const sourceRecord = entry as unknown as Record<string, unknown>;
  const translationRecord = translation as Record<string, unknown>;
  const result = { ...localized } as unknown as Record<string, unknown>;

  for (const field of METADATA_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(translationRecord, field)) continue;
    const translatedValue = translationRecord[field];
    if (typeof translatedValue !== 'string') continue;
    const sourceValue = sourceRecord[field];
    if (typeof sourceValue !== 'string') {
      if (sourceValue === undefined) delete result[field];
      continue;
    }
    const invalidNumbers =
      numericSignature(sourceValue) !== numericSignature(translatedValue);
    const inventedValue = sourceValue === '' && translatedValue !== '';
    const invalidSpeed =
      field === 'speed' && hasIncorrectSpeedLabels(sourceValue, translatedValue);
    if (!invalidNumbers && !inventedValue && !invalidSpeed) continue;
    result[field] = localizeCompendiumValue(sourceValue, locale, field) ?? sourceValue;
  }

  return result as T;
}

function repairLocalizedText(source: unknown, localized: unknown): unknown {
  if (typeof source === 'string' && typeof localized === 'string')
    return repairLocalizedMeasurements(source, localized);
  if (Array.isArray(source) && Array.isArray(localized))
    return localized.map((value, index) =>
      index < source.length ? repairLocalizedText(source[index], value) : value,
    );
  if (isRecord(source) && isRecord(localized)) {
    const result = { ...localized };
    for (const [key, value] of Object.entries(source))
      if (Object.prototype.hasOwnProperty.call(result, key))
        result[key] = repairLocalizedText(value, result[key]);
    return result;
  }
  return localized;
}

function isSubclassRecord(value: unknown): value is ClassSubclass {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ClassSubclass>;
  return typeof record.name === 'string' && typeof record.source === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function localizeSubclasses(
  baseSubclasses: ClassSubclass[],
  localizedSubclasses: ClassSubclass[],
): ClassSubclass[] {
  const used = new Set<number>();
  return localizedSubclasses.map((subclass, index) => {
    const localizedEnglishName =
      typeof subclass.englishName === 'string' ? subclass.englishName : undefined;
    const exactIdentity = baseSubclasses.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) &&
        localizedEnglishName !== undefined &&
        candidate.name === localizedEnglishName &&
        candidate.source === subclass.source,
    );
    const exact = baseSubclasses.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) &&
        candidate.name === subclass.name &&
        candidate.source === subclass.source,
    );
    const sameSource = baseSubclasses.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) && candidate.source === subclass.source,
    );
    const indexed =
      !used.has(index) && baseSubclasses[index]?.source === subclass.source ? index : -1;
    const candidateIndex =
      exactIdentity >= 0
        ? exactIdentity
        : exact >= 0
          ? exact
          : indexed >= 0
            ? indexed
            : sameSource >= 0
              ? sameSource
              : index;
    const baseSubclass = baseSubclasses[candidateIndex];
    if (!baseSubclass) return subclass;
    used.add(candidateIndex);
    return {
      ...baseSubclass,
      ...subclass,
      ...(subclass.name !== baseSubclass.name && !subclass.englishName
        ? { englishName: baseSubclass.name }
        : {}),
    };
  });
}

function mergeSubclassMedia<T extends CompendiumEntryBase>(
  entry: T,
  translation: EntryOverlay,
  merged: T,
): T {
  const baseSubclasses = (entry as Partial<ClassEntry>).subclasses;
  const localizedSubclasses = translation.subclasses;
  if (
    !Array.isArray(baseSubclasses) ||
    !Array.isArray(localizedSubclasses) ||
    !baseSubclasses.every(isSubclassRecord) ||
    !localizedSubclasses.every(isSubclassRecord)
  )
    return merged;

  const subclasses = localizeSubclasses(
    baseSubclasses as ClassSubclass[],
    localizedSubclasses as ClassSubclass[],
  );

  return { ...merged, subclasses } as T;
}

function mergeVariantData<T extends CompendiumEntryBase>(
  entry: T,
  translation: EntryOverlay,
  merged: T,
): T {
  const baseVariant = (entry as { variant?: unknown }).variant;
  const translatedVariant = translation.variant;
  if (!isRecord(baseVariant) || !isRecord(translatedVariant)) return merged;
  return { ...merged, variant: { ...baseVariant, ...translatedVariant } } as T;
}

function preserveSpellReferences<T extends CompendiumEntryBase>(
  entry: T,
  translation: EntryOverlay,
  merged: T,
): T {
  const baseSpell = entry as Partial<SpellEntry>;
  const translatedSpell = translation as Partial<SpellEntry>;
  const result = { ...merged } as T & Partial<SpellEntry>;
  if (isStringArray(baseSpell.classes) && isStringArray(translatedSpell.classes)) {
    result._englishClasses = baseSpell.classes;
  }
  if (isStringArray(baseSpell.subclasses) && isStringArray(translatedSpell.subclasses)) {
    result._englishSubclasses = baseSpell.subclasses;
  }
  return result;
}

function preserveMonsterHabitat<T extends CompendiumEntryBase>(entry: T, merged: T): T {
  const baseMonster = entry as Partial<MonsterEntry>;
  const localizedMonster = merged as Partial<MonsterEntry>;
  if (
    typeof baseMonster.habitat === 'string' &&
    typeof localizedMonster.habitat === 'string' &&
    localizedMonster.habitat !== baseMonster.habitat
  ) {
    return { ...merged, _englishHabitat: baseMonster.habitat } as T;
  }
  return merged;
}

export function localizeEntry<T extends CompendiumEntryBase>(
  entry: T,
  overlay: CategoryOverlay | undefined,
  locale: Locale = 'pl',
): T {
  const translation = overlay?.[entry.id];
  if (!translation) return entry;
  const merged = mergeSubclassMedia(entry, translation, {
    ...entry,
    ...translation,
  } as T);
  const localized = repairLocalizedText(
    entry,
    repairLocalizedMetadata(
      entry,
      translation,
      preserveMonsterHabitat(
        entry,
        preserveSpellReferences(
          entry,
          translation,
          mergeVariantData(entry, translation, merged),
        ),
      ),
      locale,
    ),
  ) as T;
  const translatedName = (translation as { name?: unknown }).name;
  if (typeof translatedName === 'string' && translatedName !== entry.name) {
    localized.englishName = entry.name;
  }
  return localized;
}

export function localizeItems<T extends CompendiumEntryBase>(
  items: T[],
  overlay: CategoryOverlay | undefined,
  locale: Locale = 'pl',
): T[] {
  if (!overlay) return items;
  return items.map((item) => localizeEntry(item, overlay, locale));
}
