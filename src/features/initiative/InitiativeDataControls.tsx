import { useEffect, useState, type RefObject } from 'react';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { initiativeBackupText } from './files';
import { useInitiativeStore } from './store';

export function InitiativeDataControls({
  disclosure,
}: {
  disclosure: RefObject<HTMLDetailsElement | null>;
}) {
  const { t } = useT();
  const { status, raw, dirty, retrySave, reloadStored, replaceStored } =
    useInitiativeStore();
  const blocked = status === 'unreadable' || status === 'conflict';
  const [feedback, setFeedback] = useState<{ key: string; error: boolean }>();

  useEffect(() => {
    if (status !== 'saved') disclosure.current?.setAttribute('open', '');
  }, [status, disclosure]);

  const download = (original?: string) => {
    try {
      if (original !== undefined)
        downloadTextFile(original, 'fumble-initiative-original.json');
      else
        downloadTextFile(
          initiativeBackupText(useInitiativeStore.getState()),
          'fumble-initiative-backup.json',
        );
      setFeedback({ key: 'data.exported', error: false });
    } catch {
      setFeedback({ key: 'data.exportError', error: true });
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
      !(await confirm(t('initiative.confirmReload'), 'initiative.reloadStored'))
    )
      return;
    if (reloadStored()) setFeedback({ key: 'initiative.reloaded', error: false });
  };

  const replace = async () => {
    if (await confirm(t('initiative.confirmReplace'), 'initiative.replaceStored'))
      replaceStored(raw);
  };

  if (status === 'saved' && !feedback) return null;

  return (
    <details ref={disclosure} className={panelClass('scroll-mt-56 space-y-3 p-4')}>
      <summary className="cursor-pointer font-semibold text-ink-50">
        {t('initiative.dataActions')}
      </summary>
      <p className="text-sm text-ink-300">{t('initiative.backupScope')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => download()}>{t('initiative.export')}</Button>
        {status === 'unsaved' && (
          <Button onClick={retrySave}>{t('initiative.retrySave')}</Button>
        )}
        {raw !== null && (
          <Button onClick={() => download(raw)}>
            {t('initiative.downloadOriginal')}
          </Button>
        )}
        {blocked && (
          <>
            <Button onClick={() => void reload()}>{t('initiative.reloadStored')}</Button>
            <Button variant="danger" onClick={() => void replace()}>
              {t('initiative.replaceStored')}
            </Button>
          </>
        )}
        <Link to="/data" className="document-link">
          {t('nav.data')}
        </Link>
      </div>
      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={feedback.error ? 'notice notice-error' : 'notice notice-success'}
        >
          {t(feedback.key)}
        </p>
      )}
    </details>
  );
}
