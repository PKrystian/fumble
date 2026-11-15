import { downloadTextFile as downloadLootFile } from '@/features/storage/downloadFile';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { sourceName } from '@/data/compendium/sources';
import { itemRarityLabel, itemTypeLabel } from '@/features/compendium/filterValues';
import { localizePlainText } from '@/features/compendium/markup';
import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import type { Locale } from '@/i18n/locales';
import { translate } from '@/i18n/translate';
import {
  isLootBackup,
  LOOT_KEY,
  LOOT_VERSION,
  MAX_PARTY_COUNT,
  validPartyNumber,
  type LootData,
  type LootItem,
  type LootResult,
} from './lootData';
import { knownLootValue, splitLootValue } from './lootGenerator';

export function displayLootItem(
  item: LootItem,
  catalog: Map<string, CompendiumEntryBase>,
  locale: Locale,
) {
  const current = catalog.get(item.id);
  return {
    name: current?.name ?? item.name,
    original: current?.englishName,
    type: itemTypeLabel(item.type, locale),
    rarity: itemRarityLabel(item.rarity, locale),
    attunement: localizePlainText(item.attunement, locale),
    source: sourceName(item.source, locale),
    missing: !current,
  };
}

export function lootTitle(result: LootResult, locale: Locale): string {
  return (
    result.name ||
    translate(
      locale,
      `dm.loot.${({ minor: 'minorReward', major: 'majorReward', hoard: 'hoardTitle', wildcard: 'wildcardTitle' } as const)[result.context.reward]}`,
    )
  );
}

export function lootParameters(result: LootResult, locale: Locale): string {
  return translate(locale, 'dm.loot.parameters', {
    reward: lootTitle({ ...result, name: '' }, locale),
    tier: translate(locale, 'dm.loot.tierLabel', { n: result.context.tierId }),
    edition: translate(locale, `dm.loot.editions.${result.context.edition}`),
  });
}

export function formatLootText(
  result: LootResult,
  catalog: Map<string, CompendiumEntryBase>,
  locale: Locale,
): string {
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const unit = t('dm.loot.goldUnit');
  const lines = [
    lootTitle(result, locale),
    new Date(result.createdAt).toLocaleString(locale),
    lootParameters(result, locale),
  ];
  if (result.context.partySize)
    lines.push(
      t('dm.loot.resultParty', {
        count: result.context.partySize,
        level: result.context.partyLevel,
      }),
    );
  if (result.context.includeUnknown) lines.push(t('dm.loot.unknownHelp'));
  lines.push('', `${t('dm.loot.coins')}: ${number(result.gold)} ${unit}`);
  if (result.gemCount)
    lines.push(
      `${t('dm.loot.gemsAndArt')}: ${result.gemCount} × ${number(result.gemValue)} ${unit}`,
    );
  lines.push(
    `${t('dm.loot.knownValue')}: ${number(knownLootValue(result))} ${unit}`,
    t('dm.loot.knownValueHelp'),
  );
  if (result.splitEnabled && validPartyNumber(result.splitCount, MAX_PARTY_COUNT)) {
    const split = splitLootValue(result, Number(result.splitCount));
    lines.push(
      `${t('dm.loot.splitCount')}: ${result.splitCount}`,
      t('dm.loot.share', { value: number(split.share), unit }),
      t('dm.loot.remainder', { value: number(split.remainder), unit }),
    );
  }
  lines.push('', t('dm.loot.items'));
  if (result.items.length === 0) lines.push(t('dm.loot.noItems'));
  for (const row of result.items) {
    const item = displayLootItem(row.item, catalog, locale);
    lines.push(
      `- ${item.name}${row.base ? ` (${displayLootItem(row.base, catalog, locale).name})` : ''}`,
    );
    lines.push([item.type, item.rarity, item.source].filter(Boolean).join(' - '));
    if (row.item.attunement)
      lines.push(
        `${t('dm.loot.attunement')}: ${item.attunement}`,
        t('dm.loot.reviewRequirements'),
      );
    if (row.item.type === 'Generic Variant' && !row.base)
      lines.push(t('dm.loot.chooseBase'));
  }
  return lines.join('\n');
}

export { downloadLootFile };

export function lootBackup(data: LootData) {
  return {
    app: 'fumble-loot',
    version: 1,
    exportedAt: new Date().toISOString(),
    loot: { state: data, version: LOOT_VERSION },
  };
}

export function downloadLootBackup(data: LootData) {
  downloadLootFile(JSON.stringify(lootBackup(data), null, 2), 'fumble-loot-backup.json');
}

export function parseLootFile(text: string): {
  data: LootData;
  exportedAt: string;
  version: number;
} {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('loot-backup-too-large');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object') throw new Error('loot-backup-invalid');
  const backup = value as Record<string, unknown>;
  const stored: unknown =
    backup.app === 'fumble'
      ? JSON.parse(parseBackup(text).data[LOOT_KEY] ?? 'null')
      : backup.loot;
  if (
    (backup.app !== 'fumble' && backup.app !== 'fumble-loot') ||
    backup.version !== 1 ||
    typeof backup.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(backup.exportedAt)) ||
    new Date(backup.exportedAt).toISOString() !== backup.exportedAt ||
    !isLootBackup(stored)
  )
    throw new Error('loot-backup-invalid');
  return { data: stored.state, exportedAt: backup.exportedAt, version: 1 };
}
