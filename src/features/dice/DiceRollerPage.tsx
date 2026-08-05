import { useState } from 'react';
import { Eraser, Plus, Trash2, X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button, IconButton, TextInput, ToggleChip } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useCustomRollStore } from './customRollStore';
import { type RollMode, parseExpression, rollParsed } from './engine';
import { useRollStore } from './rollStore';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const MODES: RollMode[] = ['normal', 'advantage', 'disadvantage'];

export function DiceRollerPage() {
  const { t } = useT();
  useSeo(t('seo.pageTitles.dice'), t('seo.pageDescriptions.dice'));
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
              <Button
                key={sides}
                onClick={() => addDie(sides)}
                className="font-display text-lg font-bold text-arcane-300"
              >
                d{sides}
              </Button>
            ))}
          </div>

          {poolTerms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {poolTerms.map((term) => (
                <ToggleChip
                  key={term.sides}
                  onClick={() => removeDie(term.sides)}
                  active
                  className="gap-1 text-sm"
                >
                  {term.count}d{term.sides}
                  <X size={14} />
                </ToggleChip>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                {t('dice.modifier')}
              </span>
              <TextInput
                type="number"
                value={modifier}
                onChange={(event) => setModifier(event.target.valueAsNumber || 0)}
                className="w-24"
              />
            </label>
            <Button
              onClick={() => {
                setPool({});
                setModifier(0);
              }}
            >
              <Eraser size={14} /> {t('dice.clearPool')}
            </Button>
          </div>

          <div className="flex gap-2">
            {MODES.map((m) => (
              <ToggleChip
                key={m}
                onClick={() => setMode(m)}
                active={m === mode}
                className="text-sm"
              >
                {MODE_LABELS[m]}
              </ToggleChip>
            ))}
          </div>

          <Button
            onClick={rollPool}
            variant="primary"
            size="lg"
            className="font-display font-bold"
          >
            {t('dice.roll')}
          </Button>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                {t('dice.orTypeExpression')}
              </span>
              <TextInput
                type="text"
                value={expression}
                placeholder={t('dice.expressionPlaceholder')}
                onChange={(event) => setExpression(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && rollFromExpression()}
              />
            </label>
            <Button onClick={rollFromExpression}>{t('dice.roll')}</Button>
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
                    className={panelClass('flex items-center gap-2 p-2')}
                  >
                    <Button
                      onClick={() => roll(customRoll.expression, mode, customRoll.name)}
                      variant="ghost"
                      className="min-w-0 flex-1 justify-start text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-ink-100">
                        {customRoll.name}
                      </span>
                      <span className="block truncate text-xs text-ink-400">
                        {customRoll.expression}
                      </span>
                    </Button>
                    <IconButton
                      onClick={() => removeCustomRoll(customRoll.id)}
                      label={t('dice.removeSavedRoll', { name: customRoll.name })}
                      variant="ghost"
                      className="text-ink-500 hover:text-ember-400"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('dice.savedRollName')}
                </span>
                <TextInput
                  type="text"
                  value={customName}
                  placeholder={t('dice.savedRollNamePlaceholder')}
                  onChange={(event) => setCustomName(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('dice.savedRollExpression')}
                </span>
                <TextInput
                  type="text"
                  value={customExpression}
                  placeholder={t('dice.savedRollExpressionPlaceholder')}
                  onChange={(event) => setCustomExpression(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && saveCustomRoll()}
                />
              </label>
              <Button
                onClick={saveCustomRoll}
                disabled={!customName.trim() || !parseExpression(customExpression)}
                className="self-end"
              >
                <Plus size={15} /> {t('dice.saveRoll')}
              </Button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-400">
              {t('dice.history')}
            </h2>
            {log.length > 0 && (
              <Button onClick={clearLog} variant="ghost" size="sm">
                {t('dice.clear')}
              </Button>
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
