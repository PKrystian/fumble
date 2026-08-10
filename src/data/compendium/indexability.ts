import type { CompendiumEntryBase } from './types';

type IndexabilityItem = Pick<
  CompendiumEntryBase,
  'id' | 'name' | 'englishName' | 'source' | 'hidden' | 'otherVersions'
>;

function identity(item: IndexabilityItem): string {
  return `${item.source}|${item.englishName ?? item.name}`;
}

export function isCompendiumEntryIndexable(
  item: IndexabilityItem,
  siblings: readonly IndexabilityItem[] = [],
): boolean {
  if (!item.hidden) return true;
  if (!item.otherVersions?.length) return false;
  if (!item.otherVersions.some((version) => version.source !== item.source)) return false;

  const sameSource = siblings.filter(
    (candidate) => candidate.id !== item.id && identity(candidate) === identity(item),
  );
  if (sameSource.some((candidate) => !candidate.hidden)) return false;
  return !sameSource.some((candidate) => candidate.hidden && candidate.id < item.id);
}

export function isCompendiumSubclassIndexable(
  parent: Pick<CompendiumEntryBase, 'hidden'>,
  hasVisibleParent: boolean,
): boolean {
  return !parent.hidden || !hasVisibleParent;
}
