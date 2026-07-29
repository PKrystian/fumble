import { useState } from 'react';
import { ChevronLeft, ChevronRight, Dices, Trash2, UserPlus } from 'lucide-react';
import { rollExpression } from '@/features/dice/engine';
import { useCharacterList } from '@/features/character/store';
import { isDmCharacter } from '@/features/character/model';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { sortCombatants, useInitiativeStore } from './store';

export function InitiativeTrackerPage() {
  const { t } = useT();
  useSeo(t('nav.initiative'));
  const { combatants, round, turnId } = useInitiativeStore();
  const addCombatant = useInitiativeStore((s) => s.addCombatant);
  const updateCombatant = useInitiativeStore((s) => s.updateCombatant);
  const removeCombatant = useInitiativeStore((s) => s.removeCombatant);
  const next = useInitiativeStore((s) => s.next);
  const previous = useInitiativeStore((s) => s.previous);
  const clear = useInitiativeStore((s) => s.clear);
  const characters = useCharacterList();

  const [name, setName] = useState('');
  const [initiative, setInitiative] = useState(10);
  const [hp, setHp] = useState(0);
  const [ac, setAc] = useState(0);
  const [isPlayer, setIsPlayer] = useState(false);
  const [rosterId, setRosterId] = useState('');
  const [rosterInitiative, setRosterInitiative] = useState(10);

  const sorted = sortCombatants(combatants);

  const add = () => {
    if (!name.trim()) return;
    addCombatant({
      name: name.trim(),
      initiative,
      ac: ac || null,
      hpCurrent: hp,
      hpMax: hp,
      conditions: '',
      isPlayer,
    });
    setName('');
    setInitiative(10);
    setHp(0);
    setAc(0);
  };

  const addFromRoster = () => {
    const character = characters.find((c) => c.id === rosterId)!;
    addCombatant({
      name: character.name,
      initiative: rosterInitiative,
      ac: character.ac || null,
      hpCurrent: character.hp.current,
      hpMax: character.hp.max,
      conditions: '',
      isPlayer: true,
    });
    setRosterId('');
    setRosterInitiative(10);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-ink-50">
          {t('initiative.title')}
        </h1>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-ink-800 px-3 py-2 text-sm text-ink-200">
            {t('initiative.round')}{' '}
            <span className="font-bold text-ember-400">{round || '-'}</span>
          </span>
          <button
            type="button"
            onClick={previous}
            aria-label={t('initiative.previousTurn')}
            className="rounded-md border border-ink-700 p-2 text-ink-200 hover:bg-ink-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1 rounded-md bg-arcane-700 px-3 py-2 text-sm font-medium text-ink-50 hover:bg-arcane-500"
          >
            {t('initiative.nextTurn')} <ChevronRight size={16} />
          </button>
          {combatants.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirmDialog(t('initiative.clearAllConfirm'), {
                  tone: 'danger',
                  confirmLabel: t('common.delete'),
                });
                if (ok) clear();
              }}
              className="rounded-md border border-ink-700 p-2 text-ink-400 hover:bg-ink-800 hover:text-red-400"
              aria-label={t('initiative.clearAll')}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {characters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-ink-400">
              {t('initiative.addFromRoster')}
            </span>
            <select
              value={rosterId}
              onChange={(e) => setRosterId(e.target.value)}
              className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
            >
              <option value="">{t('initiative.chooseCharacter')}</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name || t('initiative.unnamed')}
                  {isDmCharacter(character) ? ' (DM)' : ''}
                </option>
              ))}
            </select>
          </label>
          <NumberInput
            label={t('initiative.init')}
            value={rosterInitiative}
            onChange={setRosterInitiative}
          />
          <button
            type="button"
            onClick={addFromRoster}
            disabled={!rosterId}
            className="inline-flex items-center gap-1 rounded-md bg-arcane-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-arcane-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={16} /> {t('initiative.add')}
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">
            {t('initiative.name')}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder={t('initiative.namePlaceholder')}
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
          />
        </label>
        <NumberInput
          label={t('initiative.init')}
          value={initiative}
          onChange={setInitiative}
        />
        <button
          type="button"
          aria-label={t('initiative.rollInitiative')}
          onClick={() => setInitiative(rollExpression('1d20')?.total ?? initiative)}
          className="rounded-md border border-ink-700 p-2 text-arcane-300 hover:bg-ink-800"
        >
          <Dices size={18} />
        </button>
        <NumberInput label={t('initiative.hp')} value={hp} onChange={setHp} />
        <NumberInput label={t('initiative.ac')} value={ac} onChange={setAc} />
        <label className="flex items-center gap-1 px-1 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={isPlayer}
            onChange={(e) => setIsPlayer(e.target.checked)}
            className="accent-arcane-500"
          />
          {t('initiative.pc')}
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-arcane-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-arcane-500"
        >
          {t('initiative.add')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-ink-400">
          {t('initiative.emptyState')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((c) => (
            <li
              key={c.id}
              className={[
                'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                c.id === turnId
                  ? 'border-ember-500 bg-ember-500/10'
                  : 'border-ink-700 bg-ink-900',
              ].join(' ')}
            >
              <span className="w-10 text-center font-display text-2xl font-bold text-arcane-300">
                {c.initiative}
              </span>
              <span className="flex-1 font-medium text-ink-50">
                {c.name}
                {c.isPlayer && (
                  <span className="ml-2 rounded bg-arcane-700 px-1.5 py-0.5 text-[10px] uppercase text-ink-50">
                    {t('initiative.pc')}
                  </span>
                )}
              </span>
              <label className="flex items-center gap-1 text-sm text-ink-300">
                {t('initiative.hp')}
                <input
                  type="number"
                  value={c.hpCurrent}
                  onChange={(e) =>
                    updateCombatant(c.id, { hpCurrent: e.target.valueAsNumber || 0 })
                  }
                  className="w-14 rounded border border-ink-700 bg-ink-950 px-1 py-0.5 text-center text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
                {c.hpMax > 0 && <span className="text-ink-500">/ {c.hpMax}</span>}
              </label>
              {c.ac != null && (
                <span className="text-sm text-ink-300">
                  {t('initiative.ac')} {c.ac}
                </span>
              )}
              <input
                value={c.conditions}
                onChange={(e) => updateCombatant(c.id, { conditions: e.target.value })}
                placeholder={t('initiative.conditionsPlaceholder')}
                className="w-32 rounded border border-ink-700 bg-ink-950 px-2 py-0.5 text-sm text-ink-50 focus:border-arcane-500 focus:outline-none"
              />
              <button
                type="button"
                aria-label={t('initiative.removeCombatant', { name: c.name })}
                onClick={() => removeCombatant(c.id)}
                className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex w-16 flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
      />
    </label>
  );
}
