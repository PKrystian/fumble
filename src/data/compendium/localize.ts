import type { CompendiumEntryBase } from './types';

export type EntryOverlay = Record<string, unknown>;
export type CategoryOverlay = Record<string, EntryOverlay>;

export function localizeEntry<T extends CompendiumEntryBase>(
  entry: T,
  overlay: CategoryOverlay | undefined,
): T {
  const translation = overlay?.[entry.id];
  return translation ? ({ ...entry, ...translation } as T) : entry;
}

export function localizeItems<T extends CompendiumEntryBase>(
  items: T[],
  overlay: CategoryOverlay | undefined,
): T[] {
  if (!overlay) return items;
  return items.map((item) => localizeEntry(item, overlay));
}
