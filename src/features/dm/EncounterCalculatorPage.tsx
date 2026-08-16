import { useMemo, useState } from 'react';
import { Minus, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { MonsterEntry } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { useT } from '@/i18n/useT';
import { Link } from '@/i18n/path';
import { useSeo } from '@/seo/useSeo';
import {
  type PartyMember,
  crToXp,
  partyBudget,
  pickRandomMonster,
  rateEncounter,
} from './xp';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { localizeCompendiumValue } from '@/data/compendium/localizeValue';
import {
  Button,
  IconButton,
  SearchField,
  Select,
  TextInput,
} from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';

interface EncounterMonster {
  id: string;
  name: string;
  cr: string;
  xp: number;
  count: number;
}

const RATING_COLORS: Record<string, string> = {
  Trivial: 'text-ink-300',
  Low: 'text-green-400',
  Moderate: 'text-ember-400',
  High: 'text-orange-400',
  Deadly: 'text-red-400',
};

const RATING_LABEL_KEYS: Record<string, string> = {
  Trivial: 'encounter.trivial',
  Low: 'encounter.low',
  Moderate: 'encounter.moderate',
  High: 'encounter.high',
  Deadly: 'encounter.deadly',
};

function habitatValues(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesHabitat(
  item: MonsterEntry,
  selectedHabitat: string,
  includeAny: boolean,
): boolean {
  if (!selectedHabitat) return true;
  const selected = selectedHabitat.toLowerCase();
  return habitatValues(item._englishHabitat ?? item.habitat).some((value) => {
    const habitat = value.toLowerCase();
    return habitat === selected || (includeAny && habitat === 'any');
  });
}

export function EncounterCalculatorPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.encounter'), t('seo.pageDescriptions.encounter'));
  const [party, setParty] = useState<PartyMember[]>([{ level: 1, count: 4 }]);
  const [monsters, setMonsters] = useState<EncounterMonster[]>([]);
  const [randomMonsterError, setRandomMonsterError] = useState(false);
  const { params, update } = useUrlSearchState();
  const query = params.get('q') ?? '';
  const selectedHabitat = params.get('habitat') ?? '';
  const includeAny = params.get('includeAny') === '1';

  const { status, items } = useCategoryItems(getCategory('bestiary'));

  const habitatOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of items) {
      if (item.hidden) continue;
      for (const value of habitatValues(
        (item as MonsterEntry)._englishHabitat ?? (item as MonsterEntry).habitat,
      ))
        values.add(value);
    }
    return [...values].sort((a, b) => {
      const aLabel = localizeCompendiumValue(a, locale, 'habitat') ?? a;
      const bLabel = localizeCompendiumValue(b, locale, 'habitat') ?? b;
      return aLabel.localeCompare(bLabel, locale);
    });
  }, [items, locale]);

  const randomMonsterCandidates = useMemo(
    () =>
      items
        .filter((item) => {
          if (item.hidden) return false;
          return matchesHabitat(item as MonsterEntry, selectedHabitat, includeAny);
        })
        .map((item) => {
          const monster = item as MonsterEntry;
          return { item: monster, xp: crToXp(monster.cr) };
        })
        .filter(({ xp }) => xp > 0),
    [items, selectedHabitat, includeAny],
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return items
      .filter((item) => {
        if (item.hidden) return false;
        if (!matchesHabitat(item as MonsterEntry, selectedHabitat, includeAny))
          return false;
        return !term || item.name.toLowerCase().includes(term);
      })
      .slice(0, 8);
  }, [items, query, selectedHabitat, includeAny]);

  const budget = partyBudget(party);

  const addMonster = (item: MonsterEntry) => {
    setRandomMonsterError(false);
    setMonsters((prev) => {
      const existing = prev.find((m) => m.id === item.id);
      if (existing) {
        return prev.map((m) => (m.id === item.id ? { ...m, count: m.count + 1 } : m));
      }
      return [
        ...prev,
        { id: item.id, name: item.name, cr: item.cr, xp: crToXp(item.cr), count: 1 },
      ];
    });
    update({ q: null }, true);
  };

  const setCount = (id: string, count: number) =>
    setMonsters((prev) =>
      count <= 0
        ? prev.filter((m) => m.id !== id)
        : prev.map((m) => (m.id === id ? { ...m, count } : m)),
    );

  const addRandomMonster = () => {
    const candidate = pickRandomMonster(randomMonsterCandidates, budget.high);
    if (!candidate) {
      setRandomMonsterError(true);
      return;
    }
    addMonster(candidate);
  };

  const totalXp = monsters.reduce((sum, m) => sum + m.xp * m.count, 0);
  const rating = rateEncounter(totalXp, budget);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink-50 sm:text-4xl">
        {t('encounter.title')}
      </h1>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <section className={panelClass('flex h-full flex-col gap-4 border-ink-700 p-5')}>
          <h2 className="font-display text-base font-bold uppercase tracking-wide text-ember-400">
            {t('encounter.party')}
          </h2>
          {party.map((member, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-3 rounded-lg border border-ink-800 bg-ink-950/40 p-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-ink-400">{t('encounter.count')}</span>
                <TextInput
                  type="number"
                  min={1}
                  value={member.count}
                  onChange={(e) =>
                    setParty((p) =>
                      p.map((m, i) =>
                        i === index ? { ...m, count: e.target.valueAsNumber || 0 } : m,
                      ),
                    )
                  }
                  className="w-full"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-ink-400">{t('encounter.level')}</span>
                <TextInput
                  type="number"
                  min={1}
                  max={20}
                  value={member.level}
                  onChange={(e) =>
                    setParty((p) =>
                      p.map((m, i) =>
                        i === index ? { ...m, level: e.target.valueAsNumber || 1 } : m,
                      ),
                    )
                  }
                  className="w-full"
                />
              </label>
              {party.length > 1 && (
                <IconButton
                  label={t('encounter.removePartyGroup')}
                  onClick={() => setParty((p) => p.filter((_, i) => i !== index))}
                  variant="ghost"
                  size="sm"
                  className="text-ink-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </IconButton>
              )}
            </div>
          ))}
          <Button
            onClick={() => setParty((p) => [...p, { level: 1, count: 1 }])}
            size="md"
            className="w-full self-start sm:w-auto"
          >
            <Plus size={14} /> {t('encounter.addLevelGroup')}
          </Button>

          <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-ink-700 pt-4 text-center">
            <Budget label={t('encounter.low')} value={budget.low} />
            <Budget label={t('encounter.moderate')} value={budget.moderate} />
            <Budget label={t('encounter.high')} value={budget.high} />
          </dl>
        </section>

        <section className={panelClass('flex h-full flex-col gap-4 border-ink-700 p-5')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold uppercase tracking-wide text-ember-400">
              {t('encounter.monsters')}
            </h2>
            <Button
              onClick={addRandomMonster}
              size="md"
              disabled={status !== 'ready'}
              title={t('encounter.addRandomMonsterHint')}
              className="w-full sm:w-auto"
            >
              <Shuffle size={14} /> {t('encounter.addRandomMonster')}
            </Button>
          </div>
          {randomMonsterError && (
            <p
              role="status"
              className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300"
            >
              {t('encounter.randomMonsterUnavailable')}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <SearchField
              value={query}
              onChange={(e) => update({ q: e.target.value }, true)}
              onClear={() => update({ q: null }, true)}
              placeholder={
                status === 'loading'
                  ? t('encounter.loadingBestiary')
                  : t('encounter.searchMonsters')
              }
              label={t('encounter.searchMonsters')}
              clearLabel={t('common.clearSearch')}
            />
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-ink-400">{t('encounter.habitat')}</span>
                <Select
                  aria-label={t('encounter.habitat')}
                  value={selectedHabitat}
                  onChange={(e) => {
                    const value = e.target.value;
                    update(
                      {
                        habitat: value || null,
                        includeAny: value && includeAny ? '1' : null,
                      },
                      true,
                    );
                  }}
                >
                  <option value="">{t('encounter.allHabitats')}</option>
                  {habitatOptions.map((value) => (
                    <option key={value} value={value}>
                      {localizeCompendiumValue(value, locale, 'habitat') ?? value}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-300">
                <input
                  type="checkbox"
                  checked={includeAny && Boolean(selectedHabitat)}
                  disabled={!selectedHabitat}
                  onChange={() => update({ includeAny: includeAny ? null : '1' }, true)}
                  aria-label={t('encounter.includeAny')}
                  className="h-4 w-4 rounded border-ink-600 bg-ink-950 text-arcane-500 accent-arcane-500 focus:ring-arcane-400"
                />
                {t('encounter.includeAny')}
              </label>
            </div>
          </div>
          <div className="relative">
            {results.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-ink-700 bg-ink-800 shadow-xl">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => addMonster(item as MonsterEntry)}
                      className="flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ink-700"
                    >
                      <span className="text-ink-50">{item.name}</span>
                      <span className="text-ink-400">
                        {t('encounter.crXp', {
                          cr: (item as MonsterEntry).cr,
                          xp: crToXp((item as MonsterEntry).cr),
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ul className="flex min-h-32 flex-1 flex-col gap-2">
            {monsters.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/40 px-2 py-2 text-sm"
              >
                <IconButton
                  label={t('encounter.fewer', { name: m.name })}
                  onClick={() => setCount(m.id, m.count - 1)}
                  size="sm"
                >
                  <Minus size={12} />
                </IconButton>
                <span className="w-6 text-center font-mono text-ink-50">{m.count}</span>
                <IconButton
                  label={t('encounter.more', { name: m.name })}
                  onClick={() => setCount(m.id, m.count + 1)}
                  size="sm"
                >
                  <Plus size={12} />
                </IconButton>
                <Link
                  to={`/compendium/bestiary/${m.id}`}
                  className="min-w-0 flex-1 truncate text-arcane-300 hover:text-arcane-200 hover:underline"
                  title={m.name}
                >
                  {m.name}
                </Link>
                <span className="text-ink-400">
                  {t('encounter.crValue', { cr: m.cr })}
                </span>
                <span className="w-16 text-right text-ink-300">
                  {t('encounter.xpValue', { xp: m.xp * m.count })}
                </span>
              </li>
            ))}
            {monsters.length === 0 && (
              <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-ink-800 p-6 text-center text-sm text-ink-400">
                {t('encounter.noMonstersYet')}
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-arcane-700 bg-ink-900 p-5 sm:grid-cols-2 sm:gap-6 sm:p-6">
        <div>
          <p className="text-sm text-ink-400">{t('encounter.totalXp')}</p>
          <p className="font-display text-3xl font-bold tabular-nums text-ink-50">
            {totalXp}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-400">{t('encounter.difficulty')}</p>
          <p className={`font-display text-3xl font-bold ${RATING_COLORS[rating]}`}>
            {t(RATING_LABEL_KEYS[rating] ?? 'encounter.trivial')}
          </p>
        </div>
      </div>
    </div>
  );
}

function Budget({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="font-display text-xl font-bold tabular-nums text-ink-50">{value}</dd>
    </div>
  );
}
