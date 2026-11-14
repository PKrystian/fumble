import { useId, useRef, useState } from 'react';
import { Dices } from 'lucide-react';
import { rollExpression } from '@/features/dice/engine';
import { Button, IconButton, Select, TextInput } from '@/features/ui/primitives';
import { inputClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import type { NewCombatant } from './model';
import { parseCombatStat, statText } from './combatStats';

const empty: NewCombatant = {
  name: '',
  initiative: null,
  ac: null,
  hpCurrent: null,
  hpMax: null,
  conditions: '',
  isPlayer: false,
};

type Stat = 'initiative' | 'hpCurrent' | 'hpMax' | 'ac';

interface Props {
  initial?: NewCombatant;
  mode?: 'manual' | 'edit' | 'preview';
  rollBonus?: number;
  disabled?: boolean;
  onSubmit: (row: NewCombatant) => boolean;
  onCancel?: () => void;
}

export function CombatantForm({
  initial = empty,
  mode = 'manual',
  rollBonus,
  disabled = false,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useT();
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [stats, setStats] = useState({
    initiative: statText(initial.initiative),
    hpCurrent: statText(initial.hpCurrent),
    hpMax: statText(initial.hpMax),
    ac: statText(initial.ac),
  });
  const [conditions, setConditions] = useState(initial.conditions);
  const [isPlayer, setIsPlayer] = useState(initial.isPlayer);
  const [attempted, setAttempted] = useState(false);
  const [rolled, setRolled] = useState<number | null>(null);

  const nameInvalid = attempted && !name.trim();
  const value = (key: Stat) => {
    const original = initial[key];
    return stats[key] === statText(original)
      ? original
      : parseCombatStat(stats[key], key === 'initiative');
  };
  const fields: { key: Stat; label: string }[] = [
    { key: 'initiative', label: 'initiative.score' },
    { key: 'hpCurrent', label: 'initiative.currentHp' },
    { key: 'hpMax', label: 'initiative.maxHp' },
    { key: 'ac', label: 'initiative.ac' },
  ];

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        const initiative = value('initiative');
        const hpCurrent = value('hpCurrent');
        const hpMax = value('hpMax');
        const ac = value('ac');
        if (
          !name.trim() ||
          initiative === undefined ||
          hpCurrent === undefined ||
          hpMax === undefined ||
          ac === undefined
        ) {
          const target = !name.trim()
            ? 'name'
            : fields.find(({ key }) => value(key) === undefined)?.key;
          document.getElementById(id + '-' + target)?.focus();
          return;
        }
        if (
          onSubmit({
            name: name.trim(),
            initiative,
            hpCurrent,
            hpMax,
            ac,
            conditions,
            isPlayer,
          }) &&
          mode === 'manual'
        ) {
          setName('');
          setStats({ initiative: '', hpCurrent: '', hpMax: '', ac: '' });
          setConditions('');
          setIsPlayer(false);
          setAttempted(false);
          setRolled(null);
          nameRef.current?.focus();
        }
      }}
      noValidate
    >
      <div className="min-w-0 space-y-1">
        <label htmlFor={id + '-name'} className="field-label block">
          {t('initiative.name')}
        </label>
        <TextInput
          ref={nameRef}
          id={id + '-name'}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('initiative.namePlaceholder')}
          disabled={disabled}
          aria-required="true"
          aria-invalid={nameInvalid || undefined}
          aria-describedby={nameInvalid ? id + '-name-error' : undefined}
        />
        {nameInvalid && (
          <span id={id + '-name-error'} className="block text-sm text-red-300">
            {t('initiative.nameRequired')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fields.map(({ key, label }) => {
          const invalid = attempted && value(key) === undefined;
          const inputId = id + '-' + key;
          return (
            <div
              key={key}
              className={
                key === 'initiative'
                  ? 'col-span-full min-w-0 space-y-1 sm:max-w-xs'
                  : 'min-w-0 space-y-1'
              }
            >
              <label className="field-label block" htmlFor={inputId}>
                {t(label)}
              </label>
              <div className="flex items-start gap-1">
                <TextInput
                  id={inputId}
                  type="text"
                  inputMode={key === 'initiative' ? 'text' : 'numeric'}
                  value={stats[key]}
                  onChange={(event) => {
                    setStats({ ...stats, [key]: event.target.value });
                    if (key === 'initiative') setRolled(null);
                  }}
                  placeholder={t('initiative.unknown')}
                  disabled={disabled}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? inputId + '-error' : undefined}
                />
                {key === 'initiative' && mode !== 'edit' && (
                  <IconButton
                    label={t('initiative.rollInitiative')}
                    disabled={disabled}
                    onClick={() => {
                      const result = rollExpression('1d20')!.total + (rollBonus ?? 0);
                      setStats({ ...stats, initiative: String(result) });
                      setRolled(result);
                    }}
                  >
                    <Dices size={18} aria-hidden="true" />
                  </IconButton>
                )}
              </div>
              {invalid && (
                <p id={inputId + '-error'} className="text-sm text-red-300">
                  {t(
                    key === 'initiative'
                      ? 'initiative.invalidInitiative'
                      : 'initiative.invalidStat',
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {(rollBonus !== undefined || rolled !== null) && (
        <p className="text-sm text-ink-300" role="status">
          {rolled === null
            ? t('initiative.rollBonus', {
                bonus: rollBonus! >= 0 ? '+' + rollBonus : String(rollBonus),
              })
            : t('initiative.rolled', { score: rolled })}
        </p>
      )}
      <label className="block space-y-1">
        <span className="field-label">{t('initiative.role')}</span>
        <Select
          value={isPlayer ? 'party' : 'dm'}
          onChange={(event) => setIsPlayer(event.target.value === 'party')}
          disabled={disabled}
        >
          <option value="dm">{t('initiative.npc')}</option>
          <option value="party">{t('initiative.pc')}</option>
        </Select>
      </label>
      {mode !== 'manual' && (
        <label className="block space-y-1">
          <span className="field-label">{t('initiative.conditions')}</span>
          <textarea
            rows={3}
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            className={inputClass('resize-y')}
            disabled={disabled}
          />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={disabled}>
          {t(mode === 'edit' ? 'common.save' : 'initiative.add')}
        </Button>
        {onCancel && <Button onClick={onCancel}>{t('common.cancel')}</Button>}
      </div>
    </form>
  );
}
