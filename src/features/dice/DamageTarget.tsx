import { useId, useState } from 'react';
import { useT } from '@/i18n/useT';
import { Button } from '@/features/ui/primitives';
import { NORMAL_DEFENSE, type DamageType, type TargetDefenses } from './damage';
import { DamageBadge } from './DamageBadge';
type TargetProps = {
  types: DamageType[];
  defenses: TargetDefenses;
  onDefenses: (defenses: TargetDefenses) => void;
};
export function DamageTarget({ types, defenses, onDefenses }: TargetProps) {
  const { t } = useT();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="border-t border-ink-700 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="text-base font-semibold text-ink-50">
          {t('dice.targetTitle')}
        </h3>
        <Button
          size="sm"
          onClick={() => onDefenses({})}
          disabled={!Object.keys(defenses).length}
        >
          {t('dice.resetTarget')}
        </Button>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-400">{t('dice.targetHelp')}</p>
      <div className="mt-3 space-y-3">
        {types.map((type) => (
          <fieldset key={type} className="damage-panel p-3" data-damage={type}>
            <legend className="px-1">
              <DamageBadge type={type} />
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['resistance', 'vulnerability', 'immunity'] as const).map((reaction) => (
                <label
                  key={reaction}
                  className="flex cursor-pointer items-center gap-2 py-3 text-sm text-ink-200"
                >
                  <input
                    type="checkbox"
                    checked={(defenses[type] ?? NORMAL_DEFENSE)[reaction]}
                    onChange={(event) =>
                      onDefenses({
                        ...defenses,
                        [type]: {
                          ...(defenses[type] ?? NORMAL_DEFENSE),
                          [reaction]: event.target.checked,
                        },
                      })
                    }
                    className="accent-arcane-500"
                  />
                  <span>{t(`dice.${reaction}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-400">{t('dice.defenseOrder')}</p>
    </section>
  );
}
export function SavedDamageTarget({ name, ...props }: TargetProps & { name: string }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <details className="mt-3" onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer py-2 text-sm font-medium text-arcane-300">
        {t('dice.targetFor', { name })}
      </summary>
      {expanded && <DamageTarget {...props} />}
    </details>
  );
}
