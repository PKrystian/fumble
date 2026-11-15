import { useState } from 'react';
import { Copy, Download, ExternalLink, RefreshCw } from 'lucide-react';
import type { CompendiumEntryBase, ItemEntry } from '@/data/compendium/types';
import { parseMarkup } from '@/features/compendium/markup';
import { OriginalName } from '@/features/ui/OriginalName';
import { Button, Select, TextInput } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { isUsableByParty, usableByNames } from './loot';
import { MAX_PARTY_COUNT, validPartyNumber, type LootResult } from './lootData';
import {
  displayLootItem,
  downloadLootFile,
  formatLootText,
  lootParameters,
  lootTitle,
} from './lootFiles';
import { knownLootValue, snapshotItem, splitLootValue } from './lootGenerator';
import { useLootStore } from './lootStore';

interface Props {
  result: LootResult;
  catalog: Map<string, CompendiumEntryBase>;
  canonical: ItemEntry[];
  pending: boolean;
  canReroll: boolean;
  reroll: () => void;
  feedback: (message: string, error?: boolean) => void;
}

export function LootResultPanel({
  result,
  catalog,
  canonical,
  pending,
  canReroll,
  reroll,
  feedback,
}: Props) {
  const { t, locale } = useT();
  const update = useLootStore((state) => state.updateResult);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(result.name);
  const title = lootTitle(result, locale);
  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });
  const unit = t('dm.loot.goldUnit');
  const validSplit = validPartyNumber(result.splitCount, MAX_PARTY_COUNT);
  const split = validSplit ? splitLootValue(result, Number(result.splitCount)) : null;
  const exportResult = async (copy: boolean) => {
    try {
      const text = formatLootText(result, catalog, locale);
      if (copy) await navigator.clipboard.writeText(text);
      else
        downloadLootFile(
          text,
          `fumble-loot-${result.id}.txt`,
          'text/plain;charset=utf-8',
        );
      feedback(t(copy ? 'dm.loot.copied' : 'dm.loot.downloaded'));
    } catch {
      feedback(t(copy ? 'dm.loot.copyError' : 'dm.loot.exportError'), true);
    }
  };

  return (
    <section aria-labelledby="loot-result-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <p className="text-xs uppercase text-ink-400">{t('dm.loot.selectedResult')}</p>
          <h2 id="loot-result-title" className="section-title">
            {title}
          </h2>
          <time
            dateTime={new Date(result.createdAt).toISOString()}
            className="text-sm text-ink-400"
          >
            {new Date(result.createdAt).toLocaleString(locale)}
          </time>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setName(result.name);
            setEditing(true);
          }}
        >
          {t('dm.loot.rename')}
        </Button>
      </div>
      {editing && (
        <form
          className={panelClass('flex flex-wrap items-end gap-3 p-4')}
          onSubmit={(event) => {
            event.preventDefault();
            update(result.id, { name: name.trim() });
            setEditing(false);
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="field-label">{t('dm.loot.resultName')}</span>
            <TextInput
              autoFocus
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <Button type="submit">{t('dm.loot.saveName')}</Button>
          <Button onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
        </form>
      )}
      <div className={panelClass('space-y-2 p-4 text-sm text-ink-300')}>
        <p>{lootParameters(result, locale)}</p>
        {result.context.partySize > 0 && (
          <p>
            {t('dm.loot.resultParty', {
              count: result.context.partySize,
              level: result.context.partyLevel,
            })}
          </p>
        )}
        {result.context.includeUnknown && <p>{t('dm.loot.unknownHelp')}</p>}
      </div>
      {pending && <p className="notice">{t('dm.loot.pendingChanges')}</p>}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={panelClass('min-w-0 p-4')}>
          <h3 className="field-label">{t('dm.loot.coins')}</h3>
          <p className="text-2xl font-bold text-ink-50 tabular-nums [overflow-wrap:anywhere]">
            {number(result.gold)} {unit}
          </p>
        </div>
        {result.gemCount > 0 && (
          <div className={panelClass('min-w-0 p-4')}>
            <h3 className="field-label">{t('dm.loot.gemsAndArt')}</h3>
            <p className="text-2xl font-bold text-ink-50 tabular-nums [overflow-wrap:anywhere]">
              {result.gemCount} × {number(result.gemValue)} {unit}
            </p>
          </div>
        )}
        <div className={panelClass('min-w-0 p-4')}>
          <h3 className="field-label">{t('dm.loot.knownValue')}</h3>
          <p className="text-2xl font-bold text-ink-50 tabular-nums [overflow-wrap:anywhere]">
            {number(knownLootValue(result))} {unit}
          </p>
          <p className="mt-2 text-xs text-ink-400">{t('dm.loot.knownValueHelp')}</p>
        </div>
      </div>
      <div className={panelClass('space-y-3 p-4')}>
        <label className="flex cursor-pointer items-center gap-3 py-1 text-sm text-ink-200">
          <input
            type="checkbox"
            className="accent-arcane-500"
            checked={result.splitEnabled}
            onChange={(event) =>
              update(result.id, { splitEnabled: event.target.checked })
            }
          />
          {t('dm.loot.split')}
        </label>
        {result.splitEnabled && (
          <>
            <label className="block max-w-xs">
              <span className="field-label">{t('dm.loot.splitCount')}</span>
              <TextInput
                type="number"
                min={1}
                max={MAX_PARTY_COUNT}
                step={1}
                value={result.splitCount}
                aria-invalid={!validSplit}
                aria-describedby={!validSplit ? 'loot-split-error' : undefined}
                onChange={(event) =>
                  update(result.id, { splitCount: event.target.value })
                }
              />
            </label>
            {!validSplit && (
              <p id="loot-split-error" role="alert" className="text-sm text-red-300">
                {t('dm.loot.invalidSplit')}
              </p>
            )}
            {split && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-200 tabular-nums">
                <p>{t('dm.loot.share', { value: number(split.share), unit })}</p>
                <p>{t('dm.loot.remainder', { value: number(split.remainder), unit })}</p>
              </div>
            )}
          </>
        )}
      </div>
      <div className={panelClass('space-y-3 p-4')}>
        <h3 className="panel-title">{t('dm.loot.items')}</h3>
        {result.items.length === 0 ? (
          <p className="empty-state">{t('dm.loot.noItems')}</p>
        ) : (
          <ul className="space-y-4">
            {result.items.map((row, index) => {
              const item = displayLootItem(row.item, catalog, locale);
              const bases = canonical.filter(
                (base) =>
                  row.baseIds.includes(base.id) &&
                  isUsableByParty(
                    {
                      ...row.item,
                      type: base.type,
                      ...(base.weaponCategory
                        ? { weaponCategory: base.weaponCategory }
                        : {}),
                    },
                    result.context.party,
                  ),
              );
              const choices = bases
                .map((base) => ({
                  base,
                  display: displayLootItem(snapshotItem(base), catalog, locale),
                }))
                .sort((a, b) => a.display.name.localeCompare(b.display.name, locale));
              const usable = row.base
                ? {
                    ...row.item,
                    type: row.base.type,
                    ...(row.base.weaponCategory
                      ? { weaponCategory: row.base.weaponCategory }
                      : {}),
                  }
                : row.item;
              return (
                <li
                  key={`${row.item.id}-${index}`}
                  className="space-y-2 border-b border-ink-800 pb-4 text-sm last:border-0 last:pb-0 [overflow-wrap:anywhere]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <Link
                        to={`/compendium/items/${row.item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="back-link inline-flex items-center gap-1"
                      >
                        {item.name}
                        <ExternalLink size={14} aria-hidden="true" className="shrink-0" />
                      </Link>
                      <OriginalName name={item.original} className="ml-2" />
                    </div>
                    <p className="text-ink-300">
                      {[item.type, item.rarity].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                  <p className="text-xs text-ink-400">{item.source}</p>
                  {item.missing && <p className="notice">{t('dm.loot.storedEntry')}</p>}
                  {row.item.type === 'Generic Variant' && (
                    <>
                      <label className="block">
                        <span className="field-label">
                          {t('dm.loot.baseItem', { name: item.name })}
                        </span>
                        <Select
                          value={row.base?.id ?? ''}
                          disabled={choices.length === 0}
                          onChange={(event) => {
                            const base = bases.find(
                              (base) => base.id === event.target.value,
                            );
                            update(result.id, {
                              items: result.items.map((value, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, base: base ? snapshotItem(base) : null }
                                  : value,
                              ),
                            });
                          }}
                        >
                          <option value="">{t('dm.loot.chooseBase')}</option>
                          {row.base &&
                            !choices.some(
                              (choice) => choice.base.id === row.base!.id,
                            ) && (
                              <option value={row.base.id}>
                                {displayLootItem(row.base, catalog, locale).name}
                              </option>
                            )}
                          {choices.map(({ base, display }) => (
                            <option key={base.id} value={base.id}>
                              {display.name} ({display.source})
                            </option>
                          ))}
                        </Select>
                      </label>
                      {!row.base && (
                        <p className="notice">
                          {t(
                            choices.length
                              ? 'dm.loot.chooseBase'
                              : 'dm.loot.noBaseChoices',
                          )}
                        </p>
                      )}
                      {bases.length < row.baseIds.length && (
                        <p className="text-xs text-ink-400">{t('dm.loot.baseMissing')}</p>
                      )}
                    </>
                  )}
                  {result.context.party.length > 0 &&
                    (row.item.type !== 'Generic Variant' || row.base) && (
                      <p className="text-xs text-ink-400">
                        {t('dm.loot.matchedCharacters', {
                          names:
                            usableByNames(
                              usable,
                              result.context.party,
                              t('character.unnamed'),
                            ).join(', ') || t('dm.loot.none'),
                        })}
                      </p>
                    )}
                  {row.item.attunement && (
                    <div className="notice">
                      <p>
                        <strong>{t('dm.loot.attunement')}: </strong>
                        {parseMarkup(item.attunement, locale)}
                      </p>
                      <p className="mt-1">{t('dm.loot.reviewRequirements')}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {result.context.party.length > 0 && (
          <>
            <p className="text-xs text-ink-400">{t('dm.loot.proficiencyHelp')}</p>
            {result.context.party.some(
              (character) =>
                !character.armorProficiencies.trim() ||
                !character.weaponProficiencies.trim(),
            ) && <p className="notice">{t('dm.loot.unknownProficiencies')}</p>}
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canReroll} onClick={reroll}>
          <RefreshCw size={16} aria-hidden="true" />
          {t('dm.loot.rerollItems')}
        </Button>
        <Button
          onClick={() => {
            void exportResult(true);
          }}
        >
          <Copy size={16} aria-hidden="true" />
          {t('dm.loot.copy')}
        </Button>
        <Button
          onClick={() => {
            void exportResult(false);
          }}
        >
          <Download size={16} aria-hidden="true" />
          {t('dm.loot.download')}
        </Button>
      </div>
    </section>
  );
}
