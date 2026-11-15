import { useState } from 'react';
import { useT } from '@/i18n/useT';
import { Link } from '@/i18n/path';
import { Button } from '@/features/ui/primitives';
import { CombatantForm } from './CombatantForm';
import { InitiativeDialog } from './InitiativeDialog';
import type { NewCombatant } from './model';
import { useInitiativeStore } from './store';

export function BestiaryInitiativeAction({
  row,
  onAdded,
}: {
  row: NewCombatant;
  onAdded: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const onClose = () => {
    setOpen(false);
    setError(false);
  };
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {t('initiative.addMonster')}
      </Button>
      {open && (
        <InitiativeDialog
          title={t('initiative.previewCreature', { name: row.name })}
          onClose={onClose}
        >
          <p className="text-sm text-ink-300">{t('initiative.creatureCopy')}</p>
          <CombatantForm
            initial={row}
            mode="preview"
            onCancel={onClose}
            onSubmit={(data) => {
              const added = useInitiativeStore.getState().addCombatant(data);
              if (added) {
                onClose();
                onAdded();
              } else setError(true);
              return added;
            }}
          />
          {error && (
            <p className="notice notice-error" role="alert">
              {t('initiative.addBlocked')}{' '}
              <Link to="/dm/initiative" className="back-link">
                {t('initiative.title')}
              </Link>
            </p>
          )}
        </InitiativeDialog>
      )}
    </>
  );
}
