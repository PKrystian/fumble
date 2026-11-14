import { useState } from 'react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { encounterBackupText } from './encounterFiles';
import { useEncounterStore } from './encounterStore';

export function EncounterDataControls() {
  const { t } = useT();
  const { data, saved, blocked, raw, retrySave, retryRead, replaceUnreadable } =
    useEncounterStore();
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();

  const download = (original = false) => {
    try {
      if (original && raw !== null)
        downloadTextFile(raw, 'fumble-encounter-original.json');
      else downloadTextFile(encounterBackupText(data), 'fumble-encounter-backup.json');
      setFeedback({ text: t('data.exported'), error: false });
    } catch {
      setFeedback({ text: t('data.exportError'), error: true });
    }
  };

  if (saved)
    return (
      <p role="status" className="text-sm text-ink-300">
        {t('encounter.saved')}
      </p>
    );

  return (
    <div className="notice notice-error space-y-3">
      <p role="alert">{t(blocked ? 'encounter.blocked' : 'encounter.unsaved')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={blocked ? retryRead : retrySave}>
          {t(blocked ? 'encounter.retryRead' : 'encounter.retrySave')}
        </Button>
        <Button onClick={() => download()}>{t('encounter.export')}</Button>
        {blocked && (
          <>
            <Button disabled={raw === null} onClick={() => download(true)}>
              {t('encounter.downloadOriginal')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void confirmDialog(t('encounter.confirmReplaceStorage'), {
                  confirmLabel: t('encounter.replaceStorage'),
                  tone: 'danger',
                  initialFocus: 'cancel',
                }).then((accepted) => {
                  if (accepted) replaceUnreadable();
                });
              }}
            >
              {t('encounter.replaceStorage')}
            </Button>
          </>
        )}
        <Link to="/data" className="document-link">
          {t('nav.data')}
        </Link>
      </div>
      {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    </div>
  );
}
