import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { downloadLootBackup, downloadLootFile } from './lootFiles';
import { useLootStore } from './lootStore';

interface Props {
  feedback: (message: string, error?: boolean) => void;
}

export function LootDataControls({ feedback }: Props) {
  const { t } = useT();
  const { data, saved, blocked, raw, retrySave, reload, replaceUnreadable } =
    useLootStore();

  const download = (original = false) => {
    try {
      if (original && raw !== null) downloadLootFile(raw, 'fumble-loot-original.json');
      else downloadLootBackup(data);
      feedback(t('dm.loot.backupDownloaded'));
    } catch {
      feedback(t('dm.loot.exportError'), true);
    }
  };

  if (saved)
    return (
      <p role="status" className="text-sm text-ink-400">
        {t('dm.loot.saved')}
      </p>
    );

  return (
    <div role="alert" className="notice notice-error space-y-3">
      <p>{t(blocked ? 'dm.loot.blocked' : 'dm.loot.unsaved')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={blocked ? reload : retrySave}>
          {t(blocked ? 'dm.loot.retryRead' : 'dm.loot.retrySave')}
        </Button>
        {!blocked && (
          <Button onClick={() => download()}>{t('dm.loot.emergencyExport')}</Button>
        )}
        {blocked && (
          <>
            <Button disabled={raw === null} onClick={() => download(true)}>
              {t('dm.loot.downloadOriginal')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void confirmDialog(t('dm.loot.confirmReplace'), {
                  title: t('dm.loot.replaceStorage'),
                  confirmLabel: t('dm.loot.replaceStorage'),
                  tone: 'danger',
                  initialFocus: 'cancel',
                }).then((accepted) => {
                  if (accepted) replaceUnreadable();
                });
              }}
            >
              {t('dm.loot.replaceStorage')}
            </Button>
          </>
        )}
        <Link to="/data" className="document-link">
          {t('nav.data')}
        </Link>
      </div>
    </div>
  );
}
