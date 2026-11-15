import { Pencil, Trash2, Undo2 } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { Button, IconButton } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { DamageBadge } from './DamageBadge';
import { SavedDamageTarget } from './DamageTarget';
import type { TargetDefenses } from './damage';
import { useCustomRollStore, type CustomRoll } from './customRollStore';

export function SavedRolls({
  onRoll,
  onEdit,
  defenses,
  onDefenses,
}: {
  onRoll: (roll: CustomRoll) => void;
  onEdit: (roll: CustomRoll) => void;
  defenses: TargetDefenses;
  onDefenses: (defenses: TargetDefenses) => void;
}) {
  const { t } = useT();
  const rolls = useCustomRollStore((state) => state.customRolls);
  const remove = useCustomRollStore((state) => state.removeCustomRoll);
  const removed = useCustomRollStore((state) => state.removed);
  const undo = useCustomRollStore((state) => state.undoRemove);
  return (
    <section aria-labelledby="saved-rolls-title" className={panelClass('order-3 p-5')}>
      <h2 id="saved-rolls-title" className="section-title">
        {t('dice.savedRolls')}
      </h2>
      <p className="mt-2 text-sm text-ink-400">{t('dice.savedRollsHelp')}</p>
      {rolls.length ? (
        <ul className="mt-4 space-y-3">
          {rolls.map((roll) => (
            <li key={roll.id} className="rounded-lg border border-ink-700 p-3">
              <div className="flex flex-wrap items-start gap-2">
                <Button
                  onClick={() => onRoll(roll)}
                  variant="ghost"
                  className="min-w-0 flex-1 justify-start text-left"
                >
                  <span className="min-w-0">
                    <span className="block break-words font-semibold [overflow-wrap:anywhere]">
                      {roll.name}
                    </span>
                    <span className="mt-1 block break-words text-xs text-ink-400 [overflow-wrap:anywhere]">
                      {roll.expression}
                    </span>
                  </span>
                </Button>
                <IconButton
                  label={t('dice.editSavedRoll', { name: roll.name })}
                  variant="ghost"
                  onClick={() => onEdit(roll)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={t('dice.removeSavedRoll', { name: roll.name })}
                  variant="ghost"
                  onClick={() => remove(roll.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </IconButton>
              </div>
              {roll.components && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...new Set(roll.components.map((part) => part.type))].map((type) => (
                    <DamageBadge type={type} key={type} />
                  ))}
                </div>
              )}
              {roll.components && (
                <SavedDamageTarget
                  name={roll.name}
                  types={[...new Set(roll.components.map((part) => part.type))]}
                  defenses={defenses}
                  onDefenses={onDefenses}
                />
              )}
              {roll.mode && roll.mode !== 'normal' && (
                <p className="mt-2 text-xs text-arcane-300">
                  {t(
                    roll.mode === 'advantage'
                      ? 'dice.modeAdvantage'
                      : 'dice.modeDisadvantage',
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state mt-4">{t('dice.noSavedRolls')}</p>
      )}
      <div className="mt-3 min-h-6" aria-live="polite">
        {removed && (
          <div className="notice flex flex-wrap items-center justify-between gap-2">
            <span>{t('dice.removedRoll', { name: removed.roll.name })}</span>
            <Button size="sm" onClick={undo}>
              <Undo2 size={15} aria-hidden="true" />
              {t('dice.undo')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
