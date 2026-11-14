import type { CompendiumEntryBase } from './types';

type IndexabilityItem = Pick<
  CompendiumEntryBase,
  'id' | 'name' | 'englishName' | 'source' | 'srd' | 'hidden' | 'otherVersions'
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
const SRD_SUBCLASS_KEYS = new Set([
  'path-of-the-berserker-xphb',
  'college-of-lore-xphb',
  'life-domain-xphb',
  'circle-of-the-land-xphb',
  'champion-xphb',
  'warrior-of-the-open-hand-xphb',
  'oath-of-devotion-xphb',
  'hunter-xphb',
  'thief-xphb',
  'draconic-sorcery-xphb',
  'fiend-patron-xphb',
  'evoker-xphb',
]);

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
  if (!item.srd && !item.hidden) return { indexable: false };
  if (!item.hidden) return { indexable: true };
  const visibleId = item.otherVersions?.find((version) =>
    siblings.some((candidate) => candidate.id === version.id && !candidate.hidden),
  )?.id;
  const visible = siblings.find((candidate) => candidate.id === visibleId);
  if (!visible) return { indexable: false };
  if (!item.srd) return { indexable: true };

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
  parent: Pick<CompendiumEntryBase, 'hidden' | 'srd'>,
  hasVisibleParent: boolean,
  subclassKey: string,
): boolean {
  return (
    parent.srd &&
    SRD_SUBCLASS_KEYS.has(subclassKey) &&
    (!parent.hidden || !hasVisibleParent)
  );
}
