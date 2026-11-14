import { useState } from 'react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { FormDialog } from '@/features/ui/FormDialog';
import { Button } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import { type Character, isDmCharacter } from './model';
import type { UpdateCharacter } from './sections';
import { useLayoutStore } from './layoutStore';
import { buildSyncPatch } from './sync';

interface CharacterSettingsModalProps {
  character: Character;
  update: UpdateCharacter;
  computed: Partial<Character> | null;
  onClose: () => void;
}

export function CharacterSettingsModal({
  character,
  update,
  computed,
  onClose,
}: CharacterSettingsModalProps) {
  const { t } = useT();
  const [status, setStatus] = useState<string | null>(null);

  const applyNow = async (data: Partial<Character>) => {
    const ok = await confirmDialog(t('character.sheet.settingsModal.applyConfirm'), {
      confirmLabel: t('character.sheet.settingsModal.apply'),
      initialFocus: 'cancel',
    });
    if (!ok) return;
    update(buildSyncPatch(character, data, true));
    setStatus(t('character.sheet.settingsModal.applied'));
  };

  const resetLayout = async () => {
    const ok = await confirmDialog(t('character.sheet.settingsModal.resetConfirm'), {
      confirmLabel: t('character.sheet.settingsModal.resetLayout'),
      initialFocus: 'cancel',
    });
    if (!ok) return;
    useLayoutStore.getState().reset();
    setStatus(t('character.sheet.settingsModal.layoutReset'));
  };

  return (
    <FormDialog
      title={t('character.sheet.settingsModal.title')}
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose}>
          {t('character.sheet.done')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6 text-sm text-ink-200">
        <section className="flex flex-col gap-3">
          <h3 className="panel-title">{t('character.sheet.settingsModal.syncTitle')}</h3>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              data-dialog-focus
              checked={character.autoSyncFeatures}
              onChange={(event) => update({ autoSyncFeatures: event.target.checked })}
              className="mt-1 accent-arcane-500"
            />
            {t('character.sheet.settingsModal.autoSync')}
          </label>
          <p className="text-ink-400">{t('character.sheet.settingsModal.syncHelp')}</p>
          <Button
            className="self-start"
            disabled={!computed || !character.autoSyncFeatures}
            onClick={() => void applyNow(computed!)}
          >
            {t('character.sheet.settingsModal.apply')}
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="panel-title">
            {t('character.sheet.settingsModal.preferences')}
          </h3>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={isDmCharacter(character)}
              onChange={(event) =>
                update({ role: event.target.checked ? 'dm' : 'party' })
              }
              className="mt-1 accent-arcane-500"
            />
            {t('character.sheet.settingsModal.dmCharacter')}
          </label>
          <Button className="self-start" onClick={() => void resetLayout()}>
            {t('character.sheet.settingsModal.resetLayout')}
          </Button>
        </section>

        <p role="status" className="empty:hidden notice notice-success">
          {status}
        </p>
      </div>
    </FormDialog>
  );
}
