import { useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import type { MonsterEntry } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { type PartyMember, crToXp, partyBudget, rateEncounter } from './xp';

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

export function EncounterCalculatorPage() {
  const { t } = useT();
  useSeo(t('nav.encounterCr'));
  const [party, setParty] = useState<PartyMember[]>([{ level: 1, count: 4 }]);
  const [monsters, setMonsters] = useState<EncounterMonster[]>([]);
  const [query, setQuery] = useState('');

  const { status, items } = useCategoryItems(getCategory('bestiary'));

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return items
      .filter((item) => !item.hidden && item.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [items, query]);

  const addMonster = (item: MonsterEntry) => {
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
    setQuery('');
  };

  const setCount = (id: string, count: number) =>
    setMonsters((prev) =>
      count <= 0
        ? prev.filter((m) => m.id !== id)
        : prev.map((m) => (m.id === id ? { ...m, count } : m)),
    );

  const budget = partyBudget(party);
  const totalXp = monsters.reduce((sum, m) => sum + m.xp * m.count, 0);
  const rating = rateEncounter(totalXp, budget);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink-50">
        Encounter Builder
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
            Party
          </h2>
          {party.map((member, index) => (
            <div key={index} className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-ink-400">Count</span>
                <input
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
                  className="w-16 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-ink-400">Level</span>
                <input
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
                  className="w-16 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>
              {party.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove party group"
                  onClick={() => setParty((p) => p.filter((_, i) => i !== index))}
                  className="rounded p-2 text-ink-400 hover:bg-ink-800 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setParty((p) => [...p, { level: 1, count: 1 }])}
            className="inline-flex items-center gap-1 self-start rounded-md border border-ink-700 px-3 py-1 text-sm text-ink-200 hover:bg-ink-800"
          >
            <Plus size={14} /> Add level group
          </button>

          <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-ink-700 pt-3 text-center">
            <Budget label="Low" value={budget.low} />
            <Budget label="Moderate" value={budget.moderate} />
            <Budget label="High" value={budget.high} />
          </dl>
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
            Monsters
          </h2>
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg bg-ink-800 px-3 py-2">
              <Search size={16} className="text-ink-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  status === 'loading' ? 'Loading bestiary…' : 'Search monsters…'
                }
                aria-label="Search monsters"
                className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-800 shadow-xl">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => addMonster(item as MonsterEntry)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-700"
                    >
                      <span className="text-ink-50">{item.name}</span>
                      <span className="text-ink-400">
                        CR {(item as MonsterEntry).cr} ·{' '}
                        {crToXp((item as MonsterEntry).cr)} XP
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ul className="flex flex-col gap-1">
            {monsters.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  aria-label={`Fewer ${m.name}`}
                  onClick={() => setCount(m.id, m.count - 1)}
                  className="rounded border border-ink-700 p-1 text-ink-200 hover:bg-ink-800"
                >
                  <Minus size={12} />
                </button>
                <span className="w-6 text-center font-mono text-ink-50">{m.count}</span>
                <button
                  type="button"
                  aria-label={`More ${m.name}`}
                  onClick={() => setCount(m.id, m.count + 1)}
                  className="rounded border border-ink-700 p-1 text-ink-200 hover:bg-ink-800"
                >
                  <Plus size={12} />
                </button>
                <span className="flex-1 text-ink-50">{m.name}</span>
                <span className="text-ink-400">CR {m.cr}</span>
                <span className="w-16 text-right text-ink-300">{m.xp * m.count} XP</span>
              </li>
            ))}
            {monsters.length === 0 && (
              <li className="py-2 text-sm text-ink-400">No monsters added yet.</li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-arcane-700 bg-ink-900 p-5">
        <div>
          <p className="text-sm text-ink-400">Total encounter XP</p>
          <p className="font-display text-3xl font-bold text-ink-50">{totalXp}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-400">Difficulty</p>
          <p className={`font-display text-3xl font-bold ${RATING_COLORS[rating]}`}>
            {rating}
          </p>
        </div>
      </div>
    </div>
  );
}

function Budget({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase text-ink-400">{label}</dt>
      <dd className="font-display text-lg font-bold text-ink-50">{value}</dd>
    </div>
  );
}
