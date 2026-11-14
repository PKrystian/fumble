import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { IconButton, TextInput } from '@/features/ui/primitives';
import { inputClass, panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import { parseCombatStat, statText } from './combatStats';
import type { Combatant } from './model';
import { useInitiativeStore } from './store';

export function CombatantRow({
  row,
  active,
  blocked,
  moveUp,
  moveDown,
  rowRef,
  onEdit,
  onRemove,
  onMove,
}: {
  row: Combatant;
  active: boolean;
  blocked: boolean;
  moveUp: boolean;
  moveDown: boolean;
  rowRef: (element: HTMLHeadingElement | null) => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useT();
  const id = useId();
  const name = row.name.trim() || t('initiative.unnamed');
  const updateCombatant = useInitiativeStore((state) => state.updateCombatant);
  const [hpDraft, setHpDraft] = useState<string | null>(null);
  const invalid = hpDraft !== null && parseCombatStat(hpDraft) === undefined;
  const commitHp = (value: string) => {
    if (value === statText(row.hpCurrent)) {
      setHpDraft(null);
      return;
    }
    const hp = parseCombatStat(value);
    if (hp !== undefined && updateCombatant(row.id, { hpCurrent: hp })) setHpDraft(null);
  };

  return (
    <li
      aria-current={active ? 'step' : undefined}
      className={panelClass(
        'min-w-0 space-y-3 p-3 aria-[current=step]:border-arcane-400 aria-[current=step]:bg-arcane-950 sm:p-4',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1 [overflow-wrap:anywhere]">
          <h3
            ref={rowRef}
            tabIndex={-1}
            className="scroll-mt-52 text-base font-semibold text-ink-50"
          >
            {name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-200">
            <span className="tabular-nums">
              {t('initiative.init')} {row.initiative ?? t('initiative.unknown')}
            </span>
            <span className="tabular-nums">
              {t('initiative.ac')} {row.ac ?? t('initiative.unknown')}
            </span>
            <span>{t(row.isPlayer ? 'initiative.pc' : 'initiative.npc')}</span>
            {active && (
              <span className="font-semibold text-arcane-200">
                {t('initiative.active')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {moveUp && (
            <IconButton
              size="sm"
              label={t('initiative.moveUp', { name })}
              disabled={blocked}
              onClick={() => onMove(-1)}
            >
              <ChevronUp size={16} aria-hidden="true" />
            </IconButton>
          )}
          {moveDown && (
            <IconButton
              size="sm"
              label={t('initiative.moveDown', { name })}
              disabled={blocked}
              onClick={() => onMove(1)}
            >
              <ChevronDown size={16} aria-hidden="true" />
            </IconButton>
          )}
          <IconButton
            size="sm"
            label={t('initiative.editCombatant', { name })}
            disabled={blocked}
            onClick={onEdit}
          >
            <Pencil size={16} aria-hidden="true" />
          </IconButton>
          <IconButton
            size="sm"
            label={t('initiative.removeCombatant', { name })}
            variant="danger"
            disabled={blocked}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div className="grid items-start gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-1">
          <label className="field-label block" htmlFor={id + '-hp'}>
            {t('initiative.hp')}
          </label>
          <div className="flex items-center gap-2">
            <TextInput
              id={id + '-hp'}
              size="sm"
              inputMode="numeric"
              value={hpDraft ?? statText(row.hpCurrent)}
              placeholder={t('initiative.unknown')}
              disabled={blocked}
              aria-label={t('initiative.combatantHp', { name })}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? id + '-hp-error' : undefined}
              onChange={(event) => setHpDraft(event.target.value)}
              onBlur={(event) => commitHp(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitHp(event.currentTarget.value);
                if (event.key === 'Escape') setHpDraft(null);
              }}
            />
            {row.hpMax !== null && (
              <span className="shrink-0 text-sm text-ink-300 tabular-nums">
                / {row.hpMax}
              </span>
            )}
          </div>
          {invalid && (
            <p className="text-sm text-red-300" id={id + '-hp-error'}>
              {t('initiative.invalidStat')}
            </p>
          )}
        </div>
        <label className="block min-w-0 space-y-1">
          <span className="field-label">{t('initiative.conditions')}</span>
          <textarea
            rows={1}
            value={row.conditions}
            disabled={blocked}
            aria-label={t('initiative.combatantConditions', { name })}
            placeholder={t('initiative.conditionsPlaceholder')}
            className={inputClass('block field-sizing-content max-h-40 resize-y', 'sm')}
            onChange={(event) =>
              updateCombatant(row.id, { conditions: event.target.value })
            }
          />
        </label>
      </div>
    </li>
  );
}
