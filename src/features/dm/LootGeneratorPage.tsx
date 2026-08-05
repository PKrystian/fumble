import { useMemo, useState } from 'react';
import {
  Coins,
  Dices,
  ExternalLink,
  Gem,
  Plus,
  RefreshCw,
  Shuffle,
  Trash2,
} from 'lucide-react';
import type { ItemEntry } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { rollExpression } from '@/features/dice/engine';
import { isDmCharacter } from '@/features/character/model';
import { useCharacterList } from '@/features/character/store';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button, IconButton, TextInput, ToggleChip } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import {
  TIERS,
  isExcludedItemType,
  isUsableByParty,
  rarityMatches,
  rarityAtMost,
  tierForLevel,
  usableByNames,
} from './loot';
import type { PartyMember } from './xp';

type Mode = 'party' | 'tier' | 'wildcard';

const MODES: Array<{ id: Mode; labelKey: string }> = [
  { id: 'party', labelKey: 'dm.loot.modeParty' },
  { id: 'tier', labelKey: 'dm.loot.modeTier' },
  { id: 'wildcard', labelKey: 'dm.loot.modeWildcard' },
];

interface HoardItem {
  item: ItemEntry;

  usableBy?: string[];
}

interface Hoard {
  gold: number;
  gemCount: number;
  gemValue: number;
  items: HoardItem[];
}

function pickRandom<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function lootablePool(items: ItemEntry[]): ItemEntry[] {
  return items.filter((item) => !item.hidden && !isExcludedItemType(item.type));
}

export function LootGeneratorPage() {
  const { t } = useT();
  useSeo(t('dm.loot.title'));
  const [mode, setMode] = useState<Mode>('party');
  const [hoard, setHoard] = useState<Hoard | null>(null);
  const { status, items } = useCategoryItems(getCategory('items'));
  const pool = useMemo(() => lootablePool(items as ItemEntry[]), [items]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink-50">
        {t('dm.loot.title')}
      </h1>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label={t('dm.loot.modeNav')}>
        {MODES.map((m) => (
          <ToggleChip
            key={m.id}
            onClick={() => {
              setMode(m.id);
              setHoard(null);
            }}
            active={m.id === mode}
            className="px-4 text-sm"
          >
            {t(m.labelKey)}
          </ToggleChip>
        ))}
      </nav>

      {mode === 'party' && (
        <PartyMode status={status} pool={pool} hoard={hoard} setHoard={setHoard} />
      )}
      {mode === 'tier' && (
        <TierMode status={status} pool={pool} hoard={hoard} setHoard={setHoard} />
      )}
      {mode === 'wildcard' && (
        <WildcardMode status={status} pool={pool} hoard={hoard} setHoard={setHoard} />
      )}

      <p className="mt-6 text-xs text-ink-500">{t('dm.loot.footerNote')}</p>
    </div>
  );
}

interface ModeProps {
  status: 'loading' | 'ready' | 'error';
  pool: ItemEntry[];
  hoard: Hoard | null;
  setHoard: (hoard: Hoard | null) => void;
}

function TierPicker({
  tierId,
  setTierId,
}: {
  tierId: number;
  setTierId: (id: number) => void;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {TIERS.map((option) => (
        <Button
          key={option.id}
          onClick={() => setTierId(option.id)}
          variant={option.id === tierId ? 'primary' : 'secondary'}
          className="h-auto flex-col items-start px-4 text-left"
          aria-pressed={option.id === tierId}
          aria-label={`${t('dm.loot.tierLabel', { n: option.id })} ${t('dm.loot.tierLevels', { min: option.minLevel, max: option.maxLevel })}`}
        >
          <span className="block font-display font-bold text-ink-50">
            {t('dm.loot.tierLabel', { n: option.id })}
          </span>
          <span className="block text-xs text-ink-400">
            {t('dm.loot.tierLevels', { min: option.minLevel, max: option.maxLevel })}
          </span>
        </Button>
      ))}
    </div>
  );
}

function TierMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const [tierId, setTierId] = useState(1);
  const tier = TIERS.find((t) => t.id === tierId)!;

  const itemsByRarity = useMemo(() => {
    return pool.filter((item) => rarityMatches(item.rarity, tier.rarities));
  }, [pool, tier]);

  const rollItems = (): HoardItem[] => {
    const itemCount = rollExpression(tier.itemDice)?.total ?? 0;
    return pickRandom(itemsByRarity, itemCount).map((item) => ({ item }));
  };

  const generate = () => {
    const gold = (rollExpression(tier.coinDice)?.total ?? 0) * tier.coinMultiplier;
    const gemCount = rollExpression('2d4')?.total ?? 0;
    setHoard({ gold, gemCount, gemValue: tier.gemValue, items: rollItems() });
  };

  return (
    <div className="flex flex-col gap-4">
      <TierPicker tierId={tierId} setTierId={setTierId} />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={generate}
          disabled={status !== 'ready'}
          variant="primary"
          size="lg"
          className="font-display font-bold"
        >
          <Dices size={20} />
          {status === 'ready' ? t('dm.loot.generateHoard') : t('dm.loot.loadingItems')}
        </Button>
        {hoard && (
          <Button onClick={() => setHoard({ ...hoard, items: rollItems() })} size="lg">
            <RefreshCw size={16} /> {t('dm.loot.rerollItems')}
          </Button>
        )}
      </div>

      <HoardResult hoard={hoard} />
    </div>
  );
}

function averageLevel(levels: number[]): number {
  if (levels.length === 0) return 1;
  return Math.round(levels.reduce((sum, l) => sum + l, 0) / levels.length);
}

function manualPartyAverage(party: PartyMember[]): number {
  const count = party.reduce((sum, member) => sum + member.count, 0);
  if (count === 0) return 1;
  return Math.round(
    party.reduce((sum, member) => sum + member.level * member.count, 0) / count,
  );
}

function PartyMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const characters = useCharacterList();
  const [source, setSource] = useState<'manual' | 'saved'>('manual');
  const [manualParty, setManualParty] = useState<PartyMember[]>([{ level: 1, count: 4 }]);
  const [customSelection, setCustomSelection] = useState<Set<string> | null>(null);
  const selectedIds = customSelection ?? new Set(characters.map((c) => c.id));
  const selected = characters.filter((c) => selectedIds.has(c.id));

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCustomSelection(next);
  };

  const partyLevel =
    source === 'manual'
      ? manualPartyAverage(manualParty)
      : averageLevel(selected.map((character) => character.level));
  const partySize =
    source === 'manual'
      ? manualParty.reduce((sum, member) => sum + member.count, 0)
      : selected.length;
  const tier = tierForLevel(partyLevel);

  const poolFor = (rarities: string[]): ItemEntry[] => {
    return pool.filter(
      (item) =>
        rarityMatches(item.rarity, rarities) &&
        (source === 'manual' || isUsableByParty(item, selected)),
    );
  };

  const rollHoardItems = (candidates: ItemEntry[], count: number): HoardItem[] =>
    pickRandom(candidates, count).map((item) =>
      source === 'saved'
        ? { item, usableBy: usableByNames(item, selected, t('character.unnamed')) }
        : { item },
    );

  const generateMinor = () => {
    const gold =
      (rollExpression('2d6')?.total ?? 0) * Math.max(1, tier.coinMultiplier / 2);
    const itemCount = (rollExpression('1d2')?.total ?? 1) - 1;
    setHoard({
      gold,
      gemCount: 0,
      gemValue: tier.gemValue,
      items: rollHoardItems(poolFor([tier.rarities[0]!]), itemCount),
    });
  };

  const generateMajor = () => {
    const gold = (rollExpression(tier.coinDice)?.total ?? 0) * tier.coinMultiplier;
    const gemCount = rollExpression('2d4')?.total ?? 0;
    const itemCount = Math.max(1, rollExpression(tier.itemDice)?.total ?? 1);
    setHoard({
      gold,
      gemCount,
      gemValue: tier.gemValue,
      items: rollHoardItems(poolFor(tier.rarities), itemCount),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={panelClass('border-ink-700 p-4')}>
        <div className="mb-4 flex flex-wrap gap-2">
          <ToggleChip
            active={source === 'manual'}
            onClick={() => setSource('manual')}
            className="text-sm"
          >
            {t('dm.loot.manualParty')}
          </ToggleChip>
          <ToggleChip
            active={source === 'saved'}
            onClick={() => setSource('saved')}
            className="text-sm"
          >
            {t('dm.loot.savedCharacters')}
          </ToggleChip>
        </div>

        {source === 'manual' ? (
          <div className="space-y-3">
            {manualParty.map((member, index) => (
              <div key={index} className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-ink-400">
                    {t('dm.loot.characterCount')}
                  </span>
                  <TextInput
                    type="number"
                    min={1}
                    value={member.count}
                    onChange={(event) =>
                      setManualParty((party) =>
                        party.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, count: event.target.valueAsNumber || 0 }
                            : item,
                        ),
                      )
                    }
                    className="w-20"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-ink-400">
                    {t('dm.loot.characterLevel')}
                  </span>
                  <TextInput
                    type="number"
                    min={1}
                    max={20}
                    value={member.level}
                    onChange={(event) =>
                      setManualParty((party) =>
                        party.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, level: event.target.valueAsNumber || 1 }
                            : item,
                        ),
                      )
                    }
                    className="w-20"
                  />
                </label>
                {manualParty.length > 1 && (
                  <IconButton
                    label={t('dm.loot.removeLevelGroup')}
                    onClick={() =>
                      setManualParty((party) =>
                        party.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    variant="ghost"
                    className="text-ink-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                )}
              </div>
            ))}
            <Button
              onClick={() =>
                setManualParty((party) => [...party, { level: 1, count: 1 }])
              }
              size="sm"
            >
              <Plus size={14} /> {t('dm.loot.addLevelGroup')}
            </Button>
          </div>
        ) : characters.length > 0 ? (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t('dm.loot.partyCount', {
                selected: selected.length,
                total: characters.length,
              })}
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {characters.map((character) => (
                <li key={character.id}>
                  <label className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm hover:bg-ink-800">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(character.id)}
                      onChange={() => toggle(character.id)}
                      className="accent-arcane-500"
                    />
                    <span className="flex-1 truncate text-ink-50">
                      {character.name || t('character.unnamed')}
                      {isDmCharacter(character) && (
                        <span className="ml-1.5 rounded-full border border-ember-500/50 px-1.5 text-[0.6rem] uppercase tracking-wide text-ember-400">
                          {t('character.dmBadge')}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {t('dm.loot.level', { level: character.level })}
                      {character.className && ` ${character.className}`}
                      {character.subclass && ` (${character.subclass})`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink-300">
            {t('dm.loot.noCharactersYet')}{' '}
            <Link to="/character" className="text-arcane-300 hover:underline">
              {t('dm.loot.createYourParty')}
            </Link>
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          {t('dm.loot.effectiveTier', {
            tier: t('dm.loot.tierLabel', { n: tier.id }),
            level: partyLevel,
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={generateMinor}
          disabled={status !== 'ready' || partySize === 0}
          size="lg"
          className="font-bold"
        >
          <Dices size={18} /> {t('dm.loot.minorReward')}
        </Button>
        <Button
          onClick={generateMajor}
          disabled={status !== 'ready' || partySize === 0}
          variant="primary"
          size="lg"
          className="font-display font-bold"
        >
          <Dices size={20} /> {t('dm.loot.majorReward')}
        </Button>
      </div>
      <p className="text-xs text-ink-500">{t('dm.loot.minorMajorNote')}</p>

      <HoardResult hoard={hoard} />
    </div>
  );
}

function WildcardMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const [tierId, setTierId] = useState(1);
  const tier = TIERS.find((option) => option.id === tierId)!;
  const ceiling = tier.rarities[tier.rarities.length - 1]!;

  const cappedPool = useMemo(
    () => pool.filter((item) => rarityAtMost(item.rarity, ceiling)),
    [pool, ceiling],
  );

  const generate = () => {
    const gold = (rollExpression('3d6')?.total ?? 0) * 5;
    const itemCount = rollExpression('1d2')?.total ?? 1;
    setHoard({
      gold,
      gemCount: 0,
      gemValue: 0,
      items: pickRandom(cappedPool, itemCount).map((item) => ({ item })),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <TierPicker tierId={tierId} setTierId={setTierId} />
      <Button
        onClick={generate}
        disabled={status !== 'ready'}
        variant="primary"
        size="lg"
        className="self-start font-display font-bold"
      >
        <Shuffle size={20} />
        {status === 'ready' ? t('dm.loot.rollWildcardLoot') : t('dm.loot.loadingItems')}
      </Button>
      <p className="text-xs text-ink-500">
        {t('dm.loot.wildcardNote', {
          ceiling,
          tier: t('dm.loot.tierLabel', { n: tier.id }),
        })}
      </p>

      <HoardResult hoard={hoard} />
    </div>
  );
}

function HoardResult({ hoard }: { hoard: Hoard | null }) {
  const { t } = useT();
  if (!hoard) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={panelClass('flex items-center gap-3 border-ink-700 p-4')}>
          <Coins className="text-ember-400" size={28} aria-hidden="true" />
          <div>
            <p className="text-xs uppercase text-ink-400">{t('dm.loot.coins')}</p>
            <p className="font-display text-2xl font-bold text-ink-50">
              {hoard.gold.toLocaleString()} gp
            </p>
          </div>
        </div>
        {hoard.gemCount > 0 && (
          <div className={panelClass('flex items-center gap-3 border-ink-700 p-4')}>
            <Gem className="text-arcane-300" size={28} aria-hidden="true" />
            <div>
              <p className="text-xs uppercase text-ink-400">{t('dm.loot.gemsAndArt')}</p>
              <p className="font-display text-2xl font-bold text-ink-50">
                {hoard.gemCount} × {hoard.gemValue} gp
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={panelClass('border-ink-700 p-4')}>
        <p className="mb-2 text-xs uppercase text-ink-400">{t('dm.loot.magicItems')}</p>
        {hoard.items.length === 0 ? (
          <p className="text-ink-400">{t('dm.loot.noMagicItems')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hoard.items.map(({ item, usableBy }) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <a
                    href={`${import.meta.env.BASE_URL}compendium/items/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink-50 hover:text-arcane-300 hover:underline"
                  >
                    {item.name}
                    <ExternalLink size={12} className="text-ink-500" aria-hidden="true" />
                  </a>
                  <span className="text-ink-400">
                    {item.type} · {item.rarity}
                  </span>
                </div>
                {usableBy && (
                  <p className="text-xs text-ink-500">
                    {t('dm.loot.usableBy', {
                      names:
                        usableBy.length > 0 ? usableBy.join(', ') : t('dm.loot.none'),
                    })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
