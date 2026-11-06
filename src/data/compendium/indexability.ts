import type { CompendiumEntryBase } from './types';

type IndexabilityItem = Pick<
  CompendiumEntryBase,
  'id' | 'name' | 'englishName' | 'source' | 'hidden' | 'otherVersions'
>;

export function isCompendiumEntryIndexable(
  item: IndexabilityItem,
  _siblings: readonly IndexabilityItem[] = [],
): boolean {
  return !item.hidden;
}

export function isCompendiumSubclassIndexable(
  parent: Pick<CompendiumEntryBase, 'hidden'>,
  hasVisibleParent: boolean,
): boolean {
  return !parent.hidden || !hasVisibleParent;
}
