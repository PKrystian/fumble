import { useRef, useState } from 'react';
import { Eraser, Minus, Plus, Save } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button, IconButton, TextInput, ToggleChip } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { confirmDialog } from '@/features/ui/confirmStore';
import { MAX_CUSTOM_ROLLS, useCustomRollStore, type CustomRoll } from './customRollStore';
import {
  MAX_DICE,
  MAX_EXPRESSION_LENGTH,
  formatExpression,
  validateExpression,
  type RollMode,
} from './engine';
import {
  MAX_DAMAGE_COMPONENTS,
  type DamageComponent,
  type TargetDefenses,
} from './damage';
import { useRollStore } from './rollStore';
import { DamageEditor } from './DamageEditor';
import { RollResult, RollHistoryItem } from './RollResult';
import { focusRollResult } from './resultFocus';
import { SavedRolls } from './SavedRolls';

const DICE = [4, 6, 8, 10, 12, 20, 100];
type Composer = 'pool' | 'expression' | 'damage';
const newComponent = (): DamageComponent => ({
  id: crypto.randomUUID(),
  name: '',
  expression: '',
  type: 'slashing',
});

export function DiceRollerPage() {
  const { locale, t } = useT();
  useSeo(t('seo.pageTitles.dice'), t('seo.pageDescriptions.dice'));
  const [composer, setComposer] = useState<Composer>('pool');
  const [pool, setPool] = useState<Record<number, number>>({});
  const [modifier, setModifier] = useState('0');
  const [mode, setMode] = useState<RollMode>('normal');
  const [expression, setExpression] = useState('');
  const [components, setComponents] = useState<DamageComponent[]>(() => [newComponent()]);
  const [defenses, setDefenses] = useState<TargetDefenses>({});
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const log = useRollStore((state) => state.log);
  const roll = useRollStore((state) => state.roll);
  const damageRoll = useRollStore((state) => state.damageRoll);
  const error = useRollStore((state) => state.error);
  const clearError = useRollStore((state) => state.clearError);
  const clearLog = useRollStore((state) => state.clearLog);
  const customRolls = useCustomRollStore((state) => state.customRolls);
  const addCustomRoll = useCustomRollStore((state) => state.addCustomRoll);
  const updateCustomRoll = useCustomRollStore((state) => state.updateCustomRoll);
  const terms = DICE.filter((sides) => (pool[sides] ?? 0) > 0).map((sides) => ({
    sides,
    count: pool[sides]!,
  }));
  const count = terms.reduce((sum, term) => sum + term.count, 0);
  const poolExpression = formatExpression({ terms, modifier: Number(modifier) || 0 });
  const recipeExpression = components.map((part) => `(${part.expression})`).join(' + ');
  const currentExpression =
    composer === 'pool'
      ? poolExpression
      : composer === 'damage'
        ? recipeExpression
        : expression;
  const checked = validateExpression(currentExpression);
  const damageChecks = components.map((part) => validateExpression(part.expression));
  const damageDice = damageChecks
    .flatMap((part) => part.parsed?.terms ?? [])
    .reduce((sum, term) => sum + Math.abs(term.count), 0);
  const valid =
    composer === 'damage'
      ? components.length > 0 &&
        components.length <= MAX_DAMAGE_COMPONENTS &&
        damageChecks.every((part) => part.parsed) &&
        damageDice <= MAX_DICE
      : Boolean(checked.parsed) &&
        (composer !== 'pool' ||
          ((terms.length > 0 || Number(modifier) !== 0) &&
            modifier.trim() !== '' &&
            Number.isSafeInteger(Number(modifier))));
  const hasD20 =
    composer !== 'damage' && checked.parsed?.terms.some((term) => term.sides === 20);
  const expressionError = composer === 'expression' && expression ? checked.error : null;
  const effectiveMode = hasD20 ? mode : 'normal';
  const changeComposer = (next: Composer) => {
    setComposer(next);
    clearError();
    setSaved(false);
  };
  const changeDie = (sides: number, delta: number) => {
    setPool((previous) => ({
      ...previous,
      [sides]: Math.max(0, (previous[sides] ?? 0) + delta),
    }));
    clearError();
    setSaved(false);
  };
  const run = () => {
    const result =
      composer === 'damage'
        ? damageRoll(components, defenses, name.trim())
        : roll(currentExpression, effectiveMode, name.trim());
    if (result) focusRollResult();
  };
  const save = () => {
    if (!name.trim() || !valid || (!editingId && customRolls.length >= MAX_CUSTOM_ROLLS))
      return;
    const recipe = {
      name: name.trim(),
      expression: currentExpression,
      mode: effectiveMode,
      ...(composer === 'damage' ? { components } : {}),
    };
    if (editingId) updateCustomRoll(editingId, recipe);
    else addCustomRoll(recipe.name, recipe.expression, recipe);
    setEditingId(null);
    setName('');
    setSaved(true);
  };
  const edit = (entry: CustomRoll) => {
    setEditingId(entry.id);
    setName(entry.name);
    setExpression(entry.expression);
    setMode(entry.mode ?? 'normal');
    if (entry.components) {
      setComponents(entry.components.map((component) => ({ ...component })));
      setComposer('damage');
    } else setComposer('expression');
    clearError();
    setSaved(false);
    headingRef.current?.focus();
  };
  const play = (entry: CustomRoll) => {
    const result = entry.components
      ? damageRoll(entry.components, defenses, entry.name)
      : roll(entry.expression, entry.mode ?? 'normal', entry.name);
    if (result) focusRollResult();
  };
  const clearHistory = async () => {
    if (
      await confirmDialog(t('dice.clearHistoryConfirm'), {
        tone: 'danger',
        confirmLabel: t('dice.clearHistory'),
      })
    )
      clearLog();
  };
  const loadExample = (value: string) => {
    setExpression(value);
    changeComposer('expression');
    headingRef.current?.focus();
  };
  const loadSmite = () => {
    setComponents([
      {
        id: crypto.randomUUID(),
        name: t('dice.swordExample'),
        expression: '1d8+3',
        type: 'slashing',
      },
      {
        id: crypto.randomUUID(),
        name: t('dice.smiteExample'),
        expression: '2d8',
        type: 'radiant',
      },
    ]);
    changeComposer('damage');
    headingRef.current?.focus();
  };
  return (
    <div className="page-shell page-shell-wide">
      <h1 className="page-title">{t('dice.title')}</h1>
      <p className="page-description">{t('dice.description')}</p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          <section
            className={panelClass('order-1 p-5')}
            aria-labelledby="dice-composer-title"
          >
            <h2
              ref={headingRef}
              tabIndex={-1}
              id="dice-composer-title"
              className="section-title"
            >
              {t(editingId ? 'dice.editRoll' : 'dice.prepareRoll')}
            </h2>
            <div
              className="my-4 flex flex-wrap gap-2"
              role="group"
              aria-label={t('dice.composerLabel')}
            >
              {(['pool', 'expression', 'damage'] as const).map((value) => (
                <ToggleChip
                  key={value}
                  active={composer === value}
                  onClick={() => changeComposer(value)}
                >
                  {t(`dice.composers.${value}`)}
                </ToggleChip>
              ))}
            </div>
            {composer === 'pool' && (
              <div className="space-y-4">
                <p className="text-sm text-ink-400">{t('dice.poolHelp')}</p>
                <div className="flex flex-wrap gap-2">
                  {DICE.map((sides) => (
                    <Button
                      key={sides}
                      onClick={() => changeDie(sides, 1)}
                      disabled={count >= MAX_DICE}
                      title={t('dice.addDie', { sides })}
                    >
                      d{sides}
                    </Button>
                  ))}
                </div>
                {terms.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {terms.map((term) => (
                      <li
                        key={term.sides}
                        className="flex items-center gap-1 rounded-lg border border-ink-700 p-1"
                      >
                        <IconButton
                          label={t('dice.removeDie', { sides: term.sides })}
                          size="sm"
                          onClick={() => changeDie(term.sides, -1)}
                        >
                          <Minus size={15} aria-hidden="true" />
                        </IconButton>
                        <span className="min-w-12 text-center text-sm text-ink-50 tabular-nums">
                          {term.count}d{term.sides}
                        </span>
                        <IconButton
                          label={t('dice.addDie', { sides: term.sides })}
                          size="sm"
                          onClick={() => changeDie(term.sides, 1)}
                          disabled={count >= MAX_DICE}
                        >
                          <Plus size={15} aria-hidden="true" />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid w-28 gap-1">
                    <span className="field-label">{t('dice.modifier')}</span>
                    <TextInput
                      type="number"
                      value={modifier}
                      step={1}
                      onChange={(event) => {
                        setModifier(event.target.value);
                        clearError();
                        setSaved(false);
                      }}
                    />
                  </label>
                  <Button
                    onClick={() => {
                      setPool({});
                      setModifier('0');
                      clearError();
                    }}
                    disabled={!terms.length && modifier === '0'}
                  >
                    <Eraser size={15} aria-hidden="true" />
                    {t('dice.clearPool')}
                  </Button>
                </div>
                {!Number.isSafeInteger(Number(modifier)) && (
                  <p className="text-sm text-red-300">{t('dice.errors.invalid')}</p>
                )}
              </div>
            )}
            {composer === 'expression' && (
              <div>
                <label className="grid gap-1">
                  <span className="field-label">{t('dice.orTypeExpression')}</span>
                  <TextInput
                    value={expression}
                    maxLength={MAX_EXPRESSION_LENGTH}
                    placeholder={t('dice.expressionPlaceholder')}
                    onChange={(event) => {
                      setExpression(event.target.value);
                      clearError();
                      setSaved(false);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && valid) run();
                    }}
                    aria-invalid={Boolean(expressionError)}
                    aria-describedby="expression-help expression-error"
                  />
                </label>
                <p id="expression-help" className="mt-2 text-sm leading-6 text-ink-400">
                  {t('dice.expressionHelp')}
                </p>
                <div
                  id="expression-error"
                  className="mt-2 min-h-5 text-sm text-red-300"
                  aria-live="polite"
                >
                  {expressionError && t(`dice.errors.${expressionError}`)}
                </div>
              </div>
            )}
            {composer === 'damage' && (
              <DamageEditor
                components={components}
                onChange={(next) => {
                  setComponents(next);
                  clearError();
                  setSaved(false);
                }}
                defenses={defenses}
                onDefenses={setDefenses}
              />
            )}
            {composer !== 'damage' && (
              <div className="mt-5">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={t('dice.rollMode')}
                >
                  {(['normal', 'advantage', 'disadvantage'] as const).map((value) => (
                    <ToggleChip
                      key={value}
                      active={value === mode}
                      onClick={() => setMode(value)}
                    >
                      {t(
                        value === 'normal'
                          ? 'dice.modeNormal'
                          : value === 'advantage'
                            ? 'dice.modeAdvantage'
                            : 'dice.modeDisadvantage',
                      )}
                    </ToggleChip>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-400">
                  {t('dice.modeHelp')}
                </p>
              </div>
            )}
            <div className="mt-5 rounded-lg border border-ink-700 bg-ink-950 p-3">
              <p className="field-label">{t('dice.preview')}</p>
              <p className="mt-1 break-words text-sm text-ink-100 [overflow-wrap:anywhere]">
                {valid ? currentExpression : t('dice.buildHint')}
              </p>
            </div>
            {composer === 'damage' && damageDice > MAX_DICE && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {t('dice.errors.limit')}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              disabled={!valid}
              onClick={run}
            >
              {t(composer === 'damage' ? 'dice.rollDamage' : 'dice.roll')}
            </Button>
            <div className="mt-3 min-h-6" aria-live="polite">
              {error && (
                <p role="alert" className="notice notice-error">
                  {t(`dice.errors.${error}`)}
                </p>
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="mt-4 border-t border-ink-700 pt-4"
            >
              <label className="grid gap-1">
                <span className="field-label">{t('dice.savedRollName')}</span>
                <TextInput
                  value={name}
                  maxLength={120}
                  placeholder={t('dice.savedRollNamePlaceholder')}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-ink-400">{t('dice.saveHelp')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    !name.trim() ||
                    !valid ||
                    (!editingId && customRolls.length >= MAX_CUSTOM_ROLLS)
                  }
                >
                  <Save size={15} aria-hidden="true" />
                  {t(editingId ? 'dice.saveChanges' : 'dice.saveRoll')}
                </Button>
                {editingId && (
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setName('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
              {customRolls.length >= MAX_CUSTOM_ROLLS && !editingId && (
                <p className="mt-2 text-sm text-ink-400">{t('dice.savedLimit')}</p>
              )}
              <div aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-300">
                {saved && t('dice.saved')}
              </div>
            </form>
            <details className="mt-4 border-t border-ink-700 pt-4">
              <summary className="cursor-pointer py-2 text-sm font-medium text-arcane-300">
                {t('dice.examples')}
              </summary>
              <p className="mt-2 text-sm leading-6 text-ink-400">
                {t('dice.limitsHelp')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['1d20+5', '2d6+3', '(2d6+4)/2'].map((value) => (
                  <Button
                    size="sm"
                    key={value}
                    onClick={() =>
                      loadExample(locale === 'pl' ? value.replaceAll('d', 'k') : value)
                    }
                  >
                    {locale === 'pl' ? value.replaceAll('d', 'k') : value}
                  </Button>
                ))}
                <Button size="sm" onClick={loadSmite}>
                  {t('dice.smitePreset')}
                </Button>
              </div>
            </details>
          </section>
          <SavedRolls
            onRoll={play}
            onEdit={edit}
            defenses={defenses}
            onDefenses={setDefenses}
          />
        </div>
        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          <section
            className={panelClass('order-2 p-5')}
            aria-labelledby="latest-roll-title"
          >
            <h2 id="latest-roll-title" tabIndex={-1} className="section-title">
              {t('dice.latestRoll')}
            </h2>
            <p role="status" aria-atomic="true" className="sr-only">
              {log[0] &&
                t('dice.announcedResult', {
                  expression: log[0].outcome.expression,
                  total: log[0].outcome.total,
                })}
            </p>
            {log[0] ? (
              <div className="mt-4">
                <RollResult key={log[0].id} entry={log[0]} />
              </div>
            ) : (
              <p className="empty-state mt-4">{t('dice.emptyState')}</p>
            )}
          </section>
          <section
            className={panelClass('order-4 p-5')}
            aria-labelledby="roll-history-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="roll-history-title" className="section-title">
                {t('dice.history')}
              </h2>
              {log.length > 0 && (
                <Button onClick={() => void clearHistory()} size="sm" variant="danger">
                  {t('dice.clearHistory')}
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm text-ink-400">{t('dice.historyHelp')}</p>
            {log.length > 0 && (
              <ul className="mt-4 space-y-2">
                {log.map((entry) => (
                  <li key={entry.id}>
                    <RollHistoryItem entry={entry} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
