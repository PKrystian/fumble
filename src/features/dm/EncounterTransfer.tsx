import { useState } from 'react';
import { X } from 'lucide-react';
import { useInitiativeStore } from '@/features/initiative/store';
import { Button, IconButton } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { TRANSFER_LIMIT, type EncounterMonster } from './encounterModel';

interface Props {
  monsters: EncounterMonster[];
  onClose: () => void;
  onTransfer: (count: number, saved: boolean) => void;
}

export function EncounterTransfer({ monsters, onClose, onTransfer }: Props) {
  const { t } = useT();
  const dialogRef = useDialogFocus(true, onClose);
  const [excluded, setExcluded] = useState<string[]>([]);
  const selected = monsters.filter((monster) => !excluded.includes(monster.id));
  const count = selected.reduce((total, monster) => total + monster.count, 0);
  const [error, setError] = useState(false);

  const submit = () => {
    const added = useInitiativeStore.getState().addCombatants(
      selected.flatMap((monster) =>
        Array.from({ length: monster.count }, (_, index) => ({
          name:
            monster.count === 1
              ? monster.name
              : t('encounter.numberedCreature', { name: monster.name, n: index + 1 }),
          initiative: monster.initiative,
          ac: monster.ac,
          hpCurrent: monster.hp,
          hpMax: monster.hp,
          conditions: '',
          isPlayer: false,
        })),
      ),
    );
    if (added) onTransfer(count, useInitiativeStore.getState().status === 'saved');
    else setError(true);
  };

  return (
    <div className="dialog-overlay z-[70]" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="encounter-transfer-title"
        className="dialog-panel flex max-w-lg flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 p-4">
          <h2 className="section-title" id="encounter-transfer-title">
            {t('encounter.transferTitle')}
          </h2>
          <IconButton size="sm" label={t('common.close')} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 space-y-3 overflow-y-auto px-4 pb-4">
          <p className="text-sm text-ink-300">{t('encounter.transferHelp')}</p>
          <ul className="space-y-2">
            {monsters.map((monster) => {
              const missing =
                monster.hp === null || monster.ac === null || monster.initiative === null;
              const stats = [
                monster.hp === null ? null : t('initiative.hp') + ' ' + monster.hp,
                monster.ac === null ? null : t('initiative.ac') + ' ' + monster.ac,
                monster.initiative === null
                  ? null
                  : t('initiative.init') + ' ' + monster.initiative,
              ].filter((value) => value !== null);
              return (
                <li key={monster.id} className="rounded-lg border border-ink-700 p-2">
                  <label className="flex min-h-10 items-center gap-3 text-sm [overflow-wrap:anywhere]">
                    <input
                      className="accent-arcane-500"
                      type="checkbox"
                      checked={!excluded.includes(monster.id)}
                      onChange={(event) => {
                        setExcluded((current) =>
                          event.target.checked
                            ? current.filter((id) => id !== monster.id)
                            : [...current, monster.id],
                        );
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {t('encounter.transferCreature', {
                          name: monster.name,
                          count: monster.count,
                        })}
                      </span>
                      {stats.length > 0 && (
                        <span className="block text-xs text-ink-300">
                          {stats.join(' · ')}
                        </span>
                      )}
                      {missing && (
                        <span className="block text-xs text-ink-300">
                          {t('encounter.transferMissing')}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="notice notice-error">
              {t('encounter.transferUnavailable')}{' '}
              <Link to="/dm/initiative" className="back-link" onClick={onClose}>
                {t('encounter.openInitiative')}
              </Link>
            </p>
          )}
          {count > TRANSFER_LIMIT && (
            <p role="alert" className="notice notice-error">
              {t('encounter.transferLimit', { limit: TRANSFER_LIMIT })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-ink-700 p-4">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            disabled={count === 0 || count > TRANSFER_LIMIT}
            onClick={submit}
          >
            {t('encounter.transferConfirm', { count })}
          </Button>
        </div>
      </div>
    </div>
  );
}
