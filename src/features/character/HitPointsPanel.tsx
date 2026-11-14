import { useId, useState } from 'react';
import { BedDouble, Dices, Heart, Moon, Swords } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import {
  LIMITS,
  abilityModifier,
  applyDeathSave,
  damageCharacter,
  deathSaveResult,
  formatModifier,
  healCharacter,
  hitDiceRemaining,
  hitDieSize,
  longRest,
  longRestHitDice,
  shortRest,
  spendHitDie,
  type Character,
} from './model';
import { NumberField, Panel } from './fields';
import { parseWholeNumber } from './panelFrame';
import type { SectionProps } from './sections';
import { useSheetRoll } from './rolls';

export function HitPointsMeter({ character }: { character: Character }) {
  const { t } = useT();
  const { current, max, temp } = character.hp;
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const text = t('character.sheet.hp.summary', { current, max, temp });
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-ink-200 tabular-nums">{text}</p>
      <div
        role="meter"
        aria-label={t('character.sheet.panels.hitPoints')}
        aria-valuemin={0}
        aria-valuemax={Math.max(max, 1)}
        aria-valuenow={Math.min(current, Math.max(max, 1))}
        aria-valuetext={text}
        className="hp-meter"
      >
        <span className="hp-meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DeathSaves({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollExpression } = useSheetRoll(character, t('character.unnamed'));
  const [result, setResult] = useState<string | null>(null);
  const { successes, failures } = character.deathSaves;
  const state = failures >= 3 ? 'dead' : successes >= 3 ? 'stable' : ('dying' as const);

  const roll = () => {
    const outcome = rollExpression('1d20', t('character.sheet.deathSaves.title'));
    if (!outcome) return;
    const kind = deathSaveResult(outcome.total);
    update(applyDeathSave(character, kind));
    setResult(t(`character.sheet.deathSaves.results.${kind}`, { roll: outcome.total }));
  };

  const setCount = (key: 'successes' | 'failures', value: number) =>
    update({ deathSaves: { ...character.deathSaves, [key]: value } });

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-ink-700 p-3">
      <legend className="px-1 text-sm font-semibold text-ink-50">
        {t('character.sheet.deathSaves.title')}
      </legend>
      {(['successes', 'failures'] as const).map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-24 text-ink-300">
            {t(`character.sheet.deathSaves.${key}`)}
          </span>
          {[1, 2, 3].map((index) => (
            <label key={index} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={character.deathSaves[key] >= index}
                onChange={(event) =>
                  setCount(key, event.target.checked ? index : index - 1)
                }
                className="accent-arcane-500"
                aria-label={t(`character.sheet.deathSaves.${key}Aria`, { count: index })}
              />
            </label>
          ))}
        </div>
      ))}
      <p className="text-sm text-ink-200">{t(`character.sheet.deathSaves.${state}`)}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={roll} disabled={state !== 'dying'}>
          <Dices size={14} aria-hidden="true" />
          {t('character.sheet.deathSaves.roll')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            update({ deathSaves: { successes: 0, failures: 0 } });
            setResult(null);
          }}
        >
          {t('character.sheet.deathSaves.reset')}
        </Button>
      </div>
      <p role="status" className="text-sm text-ink-300">
        {result}
      </p>
    </fieldset>
  );
}

export function HitPointsPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const amountId = useId();
  const { rollExpression } = useSheetRoll(character, t('character.unnamed'));
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const { hp } = character;
  const value = parseWholeNumber(amount, 1, LIMITS.hp.max);
  const amountInvalid = amount.trim() !== '' && value === null;
  const die = hitDieSize(character);
  const remainingDice = hitDiceRemaining(character);
  const con = abilityModifier(character.abilities.con);

  const apply = (kind: 'heal' | 'damage' | 'temp', amountValue: number) => {
    if (kind === 'heal') update(healCharacter(character, amountValue));
    else if (kind === 'damage') update(damageCharacter(character, amountValue));
    else update({ hp: { ...hp, temp: Math.max(hp.temp, amountValue) } });
    setAmount('');
    setStatus(t(`character.sheet.hp.applied.${kind}`, { amount: amountValue }));
  };

  const spendDie = (size: number) => {
    const expression = con === 0 ? `1d${size}` : `1d${size}${formatModifier(con)}`;
    const outcome = rollExpression(expression, t('character.sheet.hitDice.rollLabel'));
    if (!outcome) return;
    update(spendHitDie(character, outcome.total));
    setStatus(t('character.sheet.hitDice.spent', { amount: Math.max(0, outcome.total) }));
  };

  const rest = async (kind: 'short' | 'long') => {
    const summary =
      kind === 'short'
        ? t('character.sheet.rest.shortSummary')
        : t('character.sheet.rest.longSummary', {
            max: hp.max,
            dice: longRestHitDice(character),
          });
    const ok = await confirmDialog(summary, {
      title: t(`character.sheet.rest.${kind}Title`),
      confirmLabel: t(`character.sheet.rest.${kind}`),
    });
    if (!ok) return;
    update(kind === 'short' ? shortRest(character) : longRest(character));
    setStatus(t(`character.sheet.rest.${kind}Done`));
  };

  return (
    <Panel title={t('character.sheet.panels.hitPoints')}>
      <HitPointsMeter character={character} />
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label={t('character.sheet.hpFields.current')}
          value={hp.current}
          min={LIMITS.hp.min}
          max={Math.max(hp.max, hp.current, 0)}
          onChange={(current) => {
            update(
              current > 0
                ? { hp: { ...hp, current }, deathSaves: { successes: 0, failures: 0 } }
                : { hp: { ...hp, current } },
            );
          }}
        />
        <NumberField
          label={t('character.sheet.hpFields.max')}
          value={hp.max}
          min={LIMITS.hp.min}
          max={LIMITS.hp.max}
          onChange={(max) =>
            update({ hp: { ...hp, max, current: Math.min(hp.current, max) } })
          }
        />
        <NumberField
          label={t('character.sheet.hpFields.temp')}
          value={hp.temp}
          min={LIMITS.hp.min}
          max={LIMITS.hp.max}
          onChange={(temp) => update({ hp: { ...hp, temp } })}
        />
      </div>

      <div
        role="group"
        className="flex flex-col gap-2"
        aria-label={t('character.sheet.hp.changeLabel')}
      >
        <label htmlFor={amountId} className="field-label">
          {t('character.sheet.hpFields.amount')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            id={amountId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={amountInvalid || undefined}
            aria-describedby={`${amountId}-help`}
            className="ui-field tabular-nums sm:w-28 sm:flex-none"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="danger"
              disabled={value === null}
              onClick={() => apply('damage', value!)}
            >
              <Swords size={16} aria-hidden="true" />
              {t('character.sheet.hpFields.damage')}
            </Button>
            <Button
              variant="success"
              disabled={value === null}
              onClick={() => apply('heal', value!)}
            >
              <Heart size={16} aria-hidden="true" />
              {t('character.sheet.hpFields.heal')}
            </Button>
            <Button
              className="col-span-2"
              disabled={value === null}
              onClick={() => apply('temp', value!)}
            >
              {t('character.sheet.hpFields.addTemp')}
            </Button>
          </div>
        </div>
        <p
          id={`${amountId}-help`}
          className={`text-xs ${amountInvalid ? 'text-red-300' : 'text-ink-400'}`}
        >
          {amountInvalid
            ? t('character.sheet.validation.range', { min: 1, max: LIMITS.hp.max })
            : t('character.sheet.hp.amountHelp')}
        </p>
      </div>

      {hp.current === 0 && hp.max > 0 && (
        <DeathSaves character={character} update={update} />
      )}

      <div className="flex flex-col gap-2 border-t border-ink-800 pt-3">
        <p className="text-sm text-ink-200">
          {die
            ? t('character.sheet.hitDice.summary', {
                remaining: remainingDice,
                total: character.level,
                die,
              })
            : t('character.sheet.hitDice.unknown')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => spendDie(die!)}
            disabled={!die || remainingDice === 0 || hp.current >= hp.max}
          >
            <Dices size={14} aria-hidden="true" />
            {t('character.sheet.hitDice.spend')}
          </Button>
          <Button size="sm" onClick={() => void rest('short')}>
            <BedDouble size={14} aria-hidden="true" />
            {t('character.sheet.rest.short')}
          </Button>
          <Button size="sm" onClick={() => void rest('long')}>
            <Moon size={14} aria-hidden="true" />
            {t('character.sheet.rest.long')}
          </Button>
        </div>
      </div>

      <p role="status" className="text-sm text-ink-300">
        {status}
      </p>
    </Panel>
  );
}
