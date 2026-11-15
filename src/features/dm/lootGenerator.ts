import type { CompendiumEntryBase, ItemEntry } from '@/data/compendium/types';
import { variantBaseItems } from '@/data/compendium/itemVariants';
import { applyContentMode } from '@/features/compendium/contentFilter';
import { canonicalItemType } from '@/features/compendium/filterValues';
import { rollExpression } from '@/features/dice/engine';
import {
  canonicalRarity,
  isExcludedItemType,
  isUsableByParty,
  rarityAtMost,
  rarityMatches,
  TIERS,
} from './loot';
import type { LootContext, LootItem, LootResult, LootResultItem } from './lootData';

export function canonicalItemField(item: CompendiumEntryBase, field: string): string {
  const source = item._filterData?.[field];
  if (typeof source === 'string') return source;
  if (field === 'name' && item.englishName) return item.englishName;
  const value = (item as unknown as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

export function canonicalLootItem(item: CompendiumEntryBase): ItemEntry | null {
  const record = item as unknown as Record<string, unknown>;
  if (
    !item.id ||
    !item.name.trim() ||
    !item.source ||
    typeof record.type !== 'string' ||
    !record.type.trim() ||
    typeof record.rarity !== 'string'
  )
    return null;
  const weaponCategory = canonicalItemField(item, 'weaponCategory');
  return {
    ...item,
    name: canonicalItemField(item, 'name'),
    type: canonicalItemType(canonicalItemField(item, 'type')),
    rarity: canonicalRarity(canonicalItemField(item, 'rarity')),
    attunement: canonicalItemField(item, 'attunement'),
    weight: canonicalItemField(item, 'weight'),
    value: canonicalItemField(item, 'value'),
    damage: canonicalItemField(item, 'damage'),
    ac: canonicalItemField(item, 'ac'),
    properties: canonicalItemField(item, 'properties'),
    range: canonicalItemField(item, 'range'),
    ...(weaponCategory ? { weaponCategory } : {}),
    entries: [],
  };
}

export function lootCatalog(items: CompendiumEntryBase[]) {
  const valid: ItemEntry[] = [];
  const skipped: CompendiumEntryBase[] = [];
  for (const item of items) {
    const canonical = canonicalLootItem(item);
    if (canonical) valid.push(canonical);
    else if (!item.hidden) skipped.push(item);
  }
  return { valid, skipped };
}

export function snapshotItem(item: ItemEntry): LootItem {
  return {
    id: item.id,
    name: item.name,
    source: item.source,
    type: item.type,
    rarity: item.rarity,
    attunement: item.attunement,
    ...(item.weaponCategory ? { weaponCategory: item.weaponCategory } : {}),
  };
}

export function variantBases(
  item: ItemEntry,
  catalog: ItemEntry[],
  context: LootContext,
): ItemEntry[] {
  const references = new Set(
    variantBaseItems(item.variant).map((base) => `${base.name}|${base.source}`),
  );
  return catalog.filter(
    (base) =>
      references.has(`${base.name}|${base.source}`) &&
      isUsableByParty(
        {
          ...item,
          type: base.type,
          ...(base.weaponCategory ? { weaponCategory: base.weaponCategory } : {}),
        },
        context.party,
      ),
  );
}

export function lootCandidates(
  catalog: ItemEntry[],
  context: LootContext,
): { candidates: ItemEntry[]; visible: ItemEntry[] } {
  const visible = applyContentMode(catalog, context.edition);
  const tier = TIERS.find((tier) => tier.id === context.tierId)!;
  const candidates = visible.filter((item) => {
    if (isExcludedItemType(item.type)) return false;
    const rarityAllowed =
      context.mode === 'wildcard'
        ? rarityAtMost(item.rarity, tier.rarities[tier.rarities.length - 1]!) ||
          (context.includeUnknown &&
            ![
              '',
              'Common',
              'Uncommon',
              'Rare',
              'Very Rare',
              'Legendary',
              'Artifact',
            ].includes(item.rarity))
        : rarityMatches(
            item.rarity,
            context.reward === 'minor' ? [tier.rarities[0]!] : tier.rarities,
          );
    if (!rarityAllowed || !isUsableByParty(item, context.party)) return false;
    const bases = variantBaseItems(item.variant);
    return (
      context.party.length === 0 ||
      bases.length === 0 ||
      variantBases(item, visible, context).length > 0
    );
  });
  return { candidates, visible };
}

function roll(expression: string): number {
  const result = rollExpression(expression);
  if (!result) throw new Error('loot-roll-failed');
  return result.total;
}

function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled.slice(0, count);
}

export function rollLootItems(
  catalog: ItemEntry[],
  context: LootContext,
): LootResultItem[] {
  const { candidates, visible } = lootCandidates(catalog, context);
  if (candidates.length === 0) throw new Error('loot-empty-pool');
  const tier = TIERS.find((tier) => tier.id === context.tierId)!;
  const count =
    context.reward === 'minor'
      ? roll('1d2') - 1
      : roll(context.mode === 'wildcard' ? '1d2' : tier.itemDice);
  return pickRandom(candidates, count).map((item) => ({
    item: snapshotItem(item),
    baseIds: variantBases(item, visible, context).map((base) => base.id),
    base: null,
  }));
}

export function generateLoot(catalog: ItemEntry[], context: LootContext): LootResult {
  const tier = TIERS.find((tier) => tier.id === context.tierId)!;
  const gold =
    context.reward === 'minor'
      ? roll('2d6') * Math.max(1, tier.coinMultiplier / 2)
      : context.mode === 'wildcard'
        ? roll('3d6') * 5
        : roll(tier.coinDice) * tier.coinMultiplier;
  const gemCount =
    context.reward === 'minor' || context.mode === 'wildcard' ? 0 : roll('2d4');
  return {
    id: crypto.randomUUID(),
    name: '',
    createdAt: Date.now(),
    context,
    gold,
    gemCount,
    gemValue: gemCount ? tier.gemValue : 0,
    items: rollLootItems(catalog, context),
    splitEnabled: false,
    splitCount: String(Math.max(1, context.partySize)),
  };
}

export function knownLootValue(result: LootResult): number {
  return result.gold + result.gemCount * result.gemValue;
}

export function splitLootValue(result: LootResult, count: number) {
  const copper = Math.round(knownLootValue(result) * 100);
  return { share: Math.floor(copper / count) / 100, remainder: (copper % count) / 100 };
}
