import { useMemo, useState } from 'react';
import { Coins, Dices, ExternalLink, Gem, RefreshCw, Shuffle } from 'lucide-react';
import type { ItemEntry } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { rollExpression } from '@/features/dice/engine';
import { isDmCharacter } from '@/features/character/model';
import { useCharacterList } from '@/features/character/store';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import {
  EXCLUDED_ITEM_TYPES,
  TIERS,
  isUsableByParty,
  rarityAtMost,
  tierForLevel,
  usableByNames,
} from './loot';

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
  return items.filter((item) => !item.hidden && !EXCLUDED_ITEM_TYPES.has(item.type));
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

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Loot generator mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setHoard(null);
            }}
            className={[
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              m.id === mode
                ? 'bg-arcane-700 text-ink-50'
                : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
            ].join(' ')}
          >
            {t(m.labelKey)}
          </button>
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

function TierMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const [tierId, setTierId] = useState(1);
  const tier = TIERS.find((t) => t.id === tierId)!;

  const itemsByRarity = useMemo(() => {
    const allowed = new Set(tier.rarities);
    return pool.filter((item) => allowed.has(item.rarity));
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

  const rerollItems = () => {
    if (!hoard) return;
    setHoard({ ...hoard, items: rollItems() });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTierId(t.id)}
            className={[
              'rounded-lg border px-4 py-2 text-left transition-colors',
              t.id === tierId
                ? 'border-arcane-500 bg-ink-800'
                : 'border-ink-700 bg-ink-900 hover:bg-ink-800',
            ].join(' ')}
          >
            <span className="block font-display font-bold text-ink-50">{t.label}</span>
            <span className="block text-xs text-ink-400">{t.levels}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={status !== 'ready'}
          className="inline-flex items-center gap-2 rounded-lg bg-arcane-700 px-4 py-3 font-display text-lg font-bold text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
        >
          <Dices size={20} />
          {status === 'ready' ? t('dm.loot.generateHoard') : t('dm.loot.loadingItems')}
        </button>
        {hoard && (
          <button
            type="button"
            onClick={rerollItems}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-4 py-3 text-sm font-medium text-ink-200 hover:bg-ink-800"
          >
            <RefreshCw size={16} /> {t('dm.loot.rerollItems')}
          </button>
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

function PartyMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const characters = useCharacterList();
  const [customSelection, setCustomSelection] = useState<Set<string> | null>(null);
  const selectedIds = customSelection ?? new Set(characters.map((c) => c.id));
  const selected = characters.filter((c) => selectedIds.has(c.id));

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCustomSelection(next);
  };

  const tier = tierForLevel(averageLevel(selected.map((c) => c.level)));

  const poolFor = (rarities: string[]): ItemEntry[] => {
    const allowed = new Set(rarities);
    return pool.filter(
      (item) => allowed.has(item.rarity) && isUsableByParty(item, selected),
    );
  };

  const rollHoardItems = (candidates: ItemEntry[], count: number): HoardItem[] =>
    pickRandom(candidates, count).map((item) => ({
      item,
      usableBy: usableByNames(item, selected),
    }));

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

  if (characters.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-700 p-8 text-center text-ink-300">
        {t('dm.loot.noCharactersYet')}{' '}
        <Link to="/character" className="text-arcane-300 hover:underline">
          {t('dm.loot.createYourParty')}
        </Link>{' '}
        {t('dm.loot.toGenerateLoot')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
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
        <p className="mt-3 text-xs text-ink-400">
          {t('dm.loot.effectiveTier', {
            tier: tier.label,
            level: averageLevel(selected.map((c) => c.level)),
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generateMinor}
          disabled={status !== 'ready' || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-4 py-3 text-sm font-bold text-ink-100 hover:bg-ink-800 disabled:opacity-50"
        >
          <Dices size={18} /> {t('dm.loot.minorReward')}
        </button>
        <button
          type="button"
          onClick={generateMajor}
          disabled={status !== 'ready' || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-arcane-700 px-4 py-3 font-display text-lg font-bold text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
        >
          <Dices size={20} /> {t('dm.loot.majorReward')}
        </button>
      </div>
      <p className="text-xs text-ink-500">{t('dm.loot.minorMajorNote')}</p>

      <HoardResult hoard={hoard} />
    </div>
  );
}

function WildcardMode({ status, pool, hoard, setHoard }: ModeProps) {
  const { t } = useT();
  const characters = useCharacterList();
  const tier = tierForLevel(averageLevel(characters.map((c) => c.level)));
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
      <button
        type="button"
        onClick={generate}
        disabled={status !== 'ready'}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-ember-500 px-4 py-3 font-display text-lg font-bold text-ink-50 hover:bg-ember-400 disabled:opacity-50"
      >
        <Shuffle size={20} />
        {status === 'ready' ? t('dm.loot.rollWildcardLoot') : t('dm.loot.loadingItems')}
      </button>
      <p className="text-xs text-ink-500">
        {t('dm.loot.wildcardNote', {
          ceiling: ceiling || t('dm.loot.mundane'),
          level: averageLevel(characters.map((c) => c.level)),
          tier: tier.label,
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
        <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <Coins className="text-ember-400" size={28} aria-hidden="true" />
          <div>
            <p className="text-xs uppercase text-ink-400">{t('dm.loot.coins')}</p>
            <p className="font-display text-2xl font-bold text-ink-50">
              {hoard.gold.toLocaleString()} gp
            </p>
          </div>
        </div>
        {hoard.gemCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
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

      <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
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
