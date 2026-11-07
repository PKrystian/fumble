import type { CompendiumEntryBase } from './types';

type IndexabilityItem = Pick<
  CompendiumEntryBase,
  'id' | 'name' | 'englishName' | 'source' | 'hidden' | 'otherVersions'
>;

const PRINTING_METADATA = new Set([
  'id',
  'name',
  'englishName',
  'source',
  'page',
  'srd',
  'hidden',
  'otherVersions',
  'image',
  'token',
  'gallery',
  'subtitle',
]);
const CORE_2014 = new Set(['PHB', 'DMG', 'MM']);
const CORE_EDITION_CATEGORIES = new Set([
  'backgrounds',
  'bestiary',
  'classes',
  'feats',
  'items',
  'species',
  'spells',
]);
const ITEM_REFERENCES = new Set(['variant', 'propertyRefs', 'masteryRefs']);

function printingContent(item: IndexabilityItem, ignoreItemReferences = false): string {
  return JSON.stringify(
    Object.entries(item)
      .filter(
        ([key]) =>
          !PRINTING_METADATA.has(key) &&
          !(ignoreItemReferences && ITEM_REFERENCES.has(key)),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function compendiumPrintingSeo(
  item: IndexabilityItem,
  siblings: readonly IndexabilityItem[],
  category: string,
): { indexable: boolean; canonicalId?: string } {
  if (!item.hidden) return { indexable: true };
  const visibleId = item.otherVersions?.find((version) =>
    siblings.some((candidate) => candidate.id === version.id && !candidate.hidden),
  )?.id;
  const visible = siblings.find((candidate) => candidate.id === visibleId);
  if (!visible) return { indexable: false };

  const content = printingContent(item);
  if (content === '[]') return { indexable: false };
  if (content === printingContent(visible)) {
    return { indexable: false, canonicalId: visible.id };
  }
  if (!CORE_2014.has(item.source) || !CORE_EDITION_CATEGORIES.has(category)) {
    return { indexable: false };
  }
  const modernId = item.otherVersions?.find(
    (version) => version.source === `X${item.source}`,
  )?.id;
  const modern = siblings.find((candidate) => candidate.id === modernId);
  const ignoreItemReferences = category === 'items';
  return {
    indexable:
      !!modern &&
      printingContent(item, ignoreItemReferences) !==
        printingContent(modern, ignoreItemReferences),
  };
}

export function isCompendiumSubclassIndexable(
  parent: Pick<CompendiumEntryBase, 'hidden'>,
  hasVisibleParent: boolean,
): boolean {
  return !parent.hidden || !hasVisibleParent;
}
