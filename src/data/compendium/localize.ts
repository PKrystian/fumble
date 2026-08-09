import type { ClassEntry, ClassSubclass, CompendiumEntryBase, SpellEntry } from './types';

export type EntryOverlay = Record<string, unknown>;
export type CategoryOverlay = Record<string, EntryOverlay>;

function isSubclassRecord(value: unknown): value is ClassSubclass {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ClassSubclass>;
  return typeof record.name === 'string' && typeof record.source === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
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

export function localizeEntry<T extends CompendiumEntryBase>(
  entry: T,
  overlay: CategoryOverlay | undefined,
): T {
  const translation = overlay?.[entry.id];
  if (!translation) return entry;
  const merged = mergeSubclassMedia(entry, translation, {
    ...entry,
    ...translation,
  } as T);
  const localized = preserveSpellReferences(entry, translation, merged);
  const translatedName = (translation as { name?: unknown }).name;
  if (typeof translatedName === 'string' && translatedName !== entry.name) {
    localized.englishName = entry.name;
  }
  return localized;
}

export function localizeItems<T extends CompendiumEntryBase>(
  items: T[],
  overlay: CategoryOverlay | undefined,
): T[] {
  if (!overlay) return items;
  return items.map((item) => localizeEntry(item, overlay));
}
