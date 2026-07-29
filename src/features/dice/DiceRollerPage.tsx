import { useState } from 'react';
import { Eraser, Plus, Trash2, X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useCustomRollStore } from './customRollStore';
import { type RollMode, parseExpression, rollParsed } from './engine';
import { useRollStore } from './rollStore';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const MODES: RollMode[] = ['normal', 'advantage', 'disadvantage'];

export function DiceRollerPage() {
  const { t } = useT();
  useSeo(t('nav.diceRoller'));
  const MODE_LABELS: Record<RollMode, string> = {
    normal: t('dice.modeNormal'),
    advantage: t('dice.modeAdvantage'),
    disadvantage: t('dice.modeDisadvantage'),
  };
  const [pool, setPool] = useState<Record<number, number>>({});
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState<RollMode>('normal');
  const [expression, setExpression] = useState('');
  const [customName, setCustomName] = useState('');
  const [customExpression, setCustomExpression] = useState('');

  const log = useRollStore((s) => s.log);
  const roll = useRollStore((s) => s.roll);
  const pushOutcome = useRollStore((s) => s.pushOutcome);
  const clearLog = useRollStore((s) => s.clearLog);
  const customRolls = useCustomRollStore((s) => s.customRolls);
  const addCustomRoll = useCustomRollStore((s) => s.addCustomRoll);
  const removeCustomRoll = useCustomRollStore((s) => s.removeCustomRoll);

  const addDie = (sides: number) =>
    setPool((prev) => ({ ...prev, [sides]: (prev[sides] ?? 0) + 1 }));
  const removeDie = (sides: number) =>
    setPool((prev) => {
      const next = { ...prev };
      const count = next[sides]! - 1;
      if (count <= 0) delete next[sides];
      else next[sides] = count;
      return next;
    });

  const poolTerms = DICE.filter((sides) => (pool[sides] ?? 0) > 0).map((sides) => ({
    count: pool[sides]!,
    sides,
  }));

  const rollPool = () => {
    if (poolTerms.length === 0 && modifier === 0) return;
    pushOutcome(rollParsed({ terms: poolTerms, modifier }, mode));
  };

  const rollFromExpression = () => {
    roll(expression, mode);
  };

  const saveCustomRoll = () => {
    if (!customName.trim() || !parseExpression(customExpression)) return;
    addCustomRoll(customName, customExpression);
    setCustomName('');
    setCustomExpression('');
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink-50">
        {t('dice.title')}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {DICE.map((sides) => (
              <button
                key={sides}
                type="button"
                onClick={() => addDie(sides)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-2 font-display text-lg font-bold text-arcane-300 hover:border-arcane-500 hover:bg-ink-800"
              >
                d{sides}
              </button>
            ))}
          </div>

          {poolTerms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {poolTerms.map((term) => (
                <button
                  key={term.sides}
                  type="button"
                  onClick={() => removeDie(term.sides)}
                  className="inline-flex items-center gap-1 rounded-full bg-arcane-700 px-3 py-1 text-sm text-ink-50 hover:bg-arcane-500"
                >
                  {term.count}d{term.sides}
                  <X size={14} />
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                {t('dice.modifier')}
              </span>
              <input
                type="number"
                value={modifier}
                onChange={(event) => setModifier(event.target.valueAsNumber || 0)}
                className="w-24 rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPool({});
                setModifier(0);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
            >
              <Eraser size={14} /> {t('dice.clearPool')}
            </button>
          </div>

          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={[
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  m === mode
                    ? 'bg-arcane-700 text-white ring-1 ring-arcane-300'
                    : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
                ].join(' ')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={rollPool}
            className="rounded-lg bg-arcane-700 px-4 py-3 font-display text-lg font-bold text-ink-50 hover:bg-arcane-500"
          >
            {t('dice.roll')}
          </button>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                {t('dice.orTypeExpression')}
              </span>
              <input
                type="text"
                value={expression}
                placeholder={t('dice.expressionPlaceholder')}
                onChange={(event) => setExpression(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && rollFromExpression()}
                className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={rollFromExpression}
              className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
            >
              {t('dice.roll')}
            </button>
          </div>

          <section className="mt-2 border-t border-ink-800 pt-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-400">
              {t('dice.savedRolls')}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t('dice.savedRollsHelp')}</p>

            {customRolls.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {customRolls.map((customRoll) => (
                  <li
                    key={customRoll.id}
                    className="flex items-center gap-2 rounded-md border border-ink-800 bg-ink-900 p-2"
                  >
                    <button
                      type="button"
                      onClick={() => roll(customRoll.expression, mode, customRoll.name)}
                      className="min-w-0 flex-1 text-left hover:text-arcane-300"
                    >
                      <span className="block truncate text-sm font-semibold text-ink-100">
                        {customRoll.name}
                      </span>
                      <span className="block truncate text-xs text-ink-400">
                        {customRoll.expression}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomRoll(customRoll.id)}
                      aria-label={t('dice.removeSavedRoll', { name: customRoll.name })}
                      className="rounded p-2 text-ink-500 hover:bg-ink-800 hover:text-ember-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('dice.savedRollName')}
                </span>
                <input
                  type="text"
                  value={customName}
                  placeholder={t('dice.savedRollNamePlaceholder')}
                  onChange={(event) => setCustomName(event.target.value)}
                  className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('dice.savedRollExpression')}
                </span>
                <input
                  type="text"
                  value={customExpression}
                  placeholder={t('dice.savedRollExpressionPlaceholder')}
                  onChange={(event) => setCustomExpression(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && saveCustomRoll()}
                  className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={saveCustomRoll}
                disabled={!customName.trim() || !parseExpression(customExpression)}
                className="inline-flex items-center justify-center gap-1 self-end rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} /> {t('dice.saveRoll')}
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-400">
              {t('dice.history')}
            </h2>
            {log.length > 0 && (
              <button
                type="button"
                onClick={clearLog}
                className="text-xs text-ink-400 hover:text-ink-50"
              >
                {t('dice.clear')}
              </button>
            )}
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-ink-500">{t('dice.emptyState')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-md bg-ink-900 px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate text-ink-300">
                    {entry.label ? `${entry.label}: ` : ''}
                    {entry.outcome.expression}
                    {entry.outcome.mode !== 'normal' &&
                      ` (${MODE_LABELS[entry.outcome.mode][0]})`}
                  </span>
                  <span className="ml-2 font-display font-bold text-ink-50">
                    {entry.outcome.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
