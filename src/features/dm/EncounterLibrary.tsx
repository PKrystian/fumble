import { useRef } from 'react';
import { useT } from '@/i18n/useT';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button, TextInput } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { ENCOUNTER_LIMIT, ENCOUNTER_NAME_LIMIT } from './encounterModel';
import { useEncounterStore } from './encounterStore';

export function EncounterLibrary({
  valid,
  focusDraft,
  announce,
}: {
  valid: boolean;
  focusDraft: () => void;
  announce: (message: string) => void;
}) {
  const { t } = useT();
  const { data, edit, startNew, saveNamed, open, duplicate, remove } =
    useEncounterStore();
  const newRef = useRef<HTMLButtonElement>(null);
  const full = data.library.length >= ENCOUNTER_LIMIT;

  const confirmReplace = (action: () => void) => {
    void confirmDialog(t('encounter.confirmDraft'), {
      confirmLabel: t('encounter.replaceDraft'),
      tone: 'danger',
      initialFocus: 'cancel',
    }).then((accepted) => {
      if (accepted) {
        action();
        requestAnimationFrame(focusDraft);
      }
    });
  };

  return (
    <details className={panelClass('space-y-4 p-4 sm:p-5')}>
      <summary className="cursor-pointer font-semibold text-ink-50">
        {t('encounter.library', { count: data.library.length })}
      </summary>
      <form
        className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid || !data.draft.name.trim() || (full && !data.selectedId)) return;
          saveNamed();
          announce(t('encounter.namedSaved'));
        }}
      >
        <label className="min-w-0">
          <span className="field-label">{t('encounter.name')}</span>
          <TextInput
            className="w-full"
            value={data.draft.name}
            maxLength={ENCOUNTER_NAME_LIMIT}
            onChange={(event) => edit({ name: event.target.value })}
          />
        </label>
        <Button
          type="submit"
          variant="primary"
          disabled={!valid || !data.draft.name.trim() || (full && !data.selectedId)}
        >
          {t(data.selectedId ? 'encounter.updateNamed' : 'encounter.saveNamed')}
        </Button>
        <Button ref={newRef} onClick={() => confirmReplace(startNew)}>
          {t('encounter.newDraft')}
        </Button>
      </form>
      <p className="text-sm text-ink-300">{t('encounter.libraryHelp')}</p>
      {full && (
        <p role="status" className="notice">
          {t('encounter.libraryFull', { limit: ENCOUNTER_LIMIT })}
        </p>
      )}
      {data.library.length === 0 ? (
        <p className="empty-state">{t('encounter.libraryEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {data.library.map((row) => (
            <li
              key={row.id}
              className={panelClass(
                'flex flex-wrap items-center justify-between gap-3 p-3',
              )}
            >
              <div className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere]">
                <p className="font-semibold">{row.name}</p>
                {data.selectedId === row.id && (
                  <p className="text-xs text-ink-300">{t('encounter.currentNamed')}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  aria-label={t('encounter.openNamed', { name: row.name })}
                  onClick={() => confirmReplace(() => open(row.id))}
                >
                  {t('encounter.open')}
                </Button>
                <Button
                  size="sm"
                  aria-label={t('encounter.duplicateNamed', { name: row.name })}
                  disabled={full}
                  onClick={() => {
                    const suffix = t('encounter.copySuffix');
                    duplicate(
                      row.id,
                      row.name.slice(0, ENCOUNTER_NAME_LIMIT - suffix.length) + suffix,
                    );
                    announce(t('encounter.duplicated'));
                  }}
                >
                  {t('encounter.duplicate')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  aria-label={t('encounter.deleteNamed', { name: row.name })}
                  onClick={() => {
                    void confirmDialog(
                      t('encounter.confirmDeleteNamed', { name: row.name }),
                      {
                        confirmLabel: t('common.delete'),
                        tone: 'danger',
                        initialFocus: 'cancel',
                      },
                    ).then((accepted) => {
                      if (accepted) {
                        remove(row.id);
                        announce(t('encounter.namedDeleted'));
                        requestAnimationFrame(() => newRef.current?.focus());
                      }
                    });
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
