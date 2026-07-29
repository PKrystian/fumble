import type { CompendiumEntryBase } from './types';

export type EntryOverlay = Record<string, unknown>;
export type CategoryOverlay = Record<string, EntryOverlay>;

export function localizeEntry<T extends CompendiumEntryBase>(
  entry: T,
  overlay: CategoryOverlay | undefined,
): T {
  const translation = overlay?.[entry.id];
  if (!translation) return entry;
  const merged = { ...entry, ...translation } as T;
  const translatedName = (translation as { name?: unknown }).name;
  if (typeof translatedName === 'string' && translatedName !== entry.name) {
    merged.englishName = entry.name;
  }
  return merged;
}

export function localizeItems<T extends CompendiumEntryBase>(
  items: T[],
  overlay: CategoryOverlay | undefined,
): T[] {
  if (!overlay) return items;
  return items.map((item) => localizeEntry(item, overlay));
}
