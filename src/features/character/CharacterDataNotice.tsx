import { useState } from 'react';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { serializeCharacters } from './characterData';
import { useCharacterStore } from './store';

export function CharacterDataNotice() {
  const { t } = useT();
  const status = useCharacterStore((state) => state.status);
  const raw = useCharacterStore((state) => state.raw);
  const dirty = useCharacterStore((state) => state.dirty);
  const [feedback, setFeedback] = useState<{ key: string; error: boolean } | null>(null);

  if (status === 'saved' && !feedback) return null;

  const download = (text: string, filename: string) => {
    try {
      downloadTextFile(text, filename);
      setFeedback({ key: 'character.data.downloaded', error: false });
    } catch {
      setFeedback({ key: 'character.data.downloadFailed', error: true });
    }
  };

  const confirm = (message: string, label: string) =>
    confirmDialog(message, {
      tone: 'danger',
      confirmLabel: t(label),
      initialFocus: 'cancel',
    });

  const reload = async () => {
    if (
      dirty &&
      !(await confirm(t('character.data.confirmReload'), 'character.data.reload'))
    )
      return;
    const ok = useCharacterStore.getState().reloadStored();
    setFeedback(
      ok
        ? { key: 'character.data.reloaded', error: false }
        : { key: 'character.data.stillUnreadable', error: true },
    );
  };

  const replace = async () => {
    if (!(await confirm(t('character.data.confirmReplace'), 'character.data.replace')))
      return;
    const ok = useCharacterStore.getState().replaceStored(raw);
    setFeedback(
      ok
        ? { key: 'character.data.replaced', error: false }
        : { key: 'character.data.replaceFailed', error: true },
    );
  };

  const message =
    status === 'unsaved'
      ? 'character.data.unsaved'
      : status === 'conflict'
        ? 'character.data.conflict'
        : status === 'unreadable'
          ? 'character.data.unreadable'
          : null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {message && (
        <div role="alert" className="notice notice-error flex flex-col gap-3">
          <p>{t(message)}</p>
          <div className="flex flex-wrap gap-2">
            {status === 'unsaved' && (
              <Button
                onClick={() =>
                  setFeedback(
                    useCharacterStore.getState().retrySave()
                      ? { key: 'character.data.saved', error: false }
                      : { key: 'character.data.retryFailed', error: true },
                  )
                }
              >
                {t('character.data.retry')}
              </Button>
            )}
            <Button
              onClick={() =>
                download(
                  serializeCharacters(useCharacterStore.getState()),
                  'fumble-characters-current.json',
                )
              }
            >
              {t('character.data.downloadCurrent')}
            </Button>
            {raw !== null && (
              <Button onClick={() => download(raw, 'fumble-characters-original.json')}>
                {t('character.data.downloadOriginal')}
              </Button>
            )}
            {(status === 'conflict' || status === 'unreadable') && (
              <>
                <Button onClick={() => void reload()}>
                  {t('character.data.reload')}
                </Button>
                <Button variant="danger" onClick={() => void replace()}>
                  {t('character.data.replace')}
                </Button>
              </>
            )}
            <Link to="/data" className="back-link mb-0 self-center">
              {t('nav.data')}
            </Link>
          </div>
        </div>
      )}
      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={feedback.error ? 'notice notice-error' : 'notice notice-success'}
        >
          {t(feedback.key)}
        </p>
      )}
    </div>
  );
}
