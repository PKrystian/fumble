import { useT } from '@/i18n/useT';
import { Link } from '@/i18n/path';
import { Button } from '@/features/ui/primitives';
import { confirmDialog } from '@/features/ui/confirmStore';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { useBookReading } from './readingStore';
import { parseBookReading } from './readingData';

const statusKeys = {
  unreadable: 'books.storageUnreadable',
  unsaved: 'books.storageError',
  conflict: 'books.storageConflict',
} as const;

export function ReadingStatus({ allowClear = false }: { allowClear?: boolean }) {
  const { t } = useT();
  const { data, status, raw, clear, retry, replace, restoreStored } = useBookReading();
  const canClear = allowClear && Object.keys(data.positions).length > 0;
  if (status === 'ready' && !canClear) return null;

  async function clearHistory() {
    if (
      await confirmDialog(t('books.clearHistoryConfirm'), {
        confirmLabel: t('books.clearHistory'),
        tone: 'danger',
        initialFocus: 'cancel',
      })
    )
      clear();
  }

  async function replaceStored() {
    if (
      await confirmDialog(t('books.replaceReadingConfirm'), {
        confirmLabel: t('books.replaceReading'),
        tone: 'danger',
        initialFocus: 'cancel',
      })
    )
      replace(raw);
  }

  async function keepStored(value: string) {
    if (
      await confirmDialog(t('books.keepStoredConfirm'), {
        confirmLabel: t('books.keepStored'),
        tone: 'danger',
        initialFocus: 'cancel',
      })
    )
      restoreStored(value);
  }

  return (
    <div className="mb-4 space-y-3">
      {status !== 'ready' && (
        <div className="notice notice-error space-y-2">
          <p role="alert">{t(statusKeys[status])}</p>
          <div className="flex flex-wrap items-center gap-2">
            {status === 'unsaved' ? (
              <Button size="sm" onClick={retry}>
                {t('common.retry')}
              </Button>
            ) : (
              <>
                {raw !== null && (
                  <Button
                    size="sm"
                    onClick={() =>
                      downloadTextFile(raw, 'fumble-book-reading-original.json')
                    }
                  >
                    {t('books.downloadOriginal')}
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => void replaceStored()}>
                  {t('books.replaceReading')}
                </Button>
                {status === 'conflict' && raw !== null && parseBookReading(raw) && (
                  <Button size="sm" onClick={() => void keepStored(raw)}>
                    {t('books.keepStored')}
                  </Button>
                )}
              </>
            )}
            <Link to="/data" className="back-link">
              {t('nav.data')}
            </Link>
          </div>
        </div>
      )}
      {canClear && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-300">{t('books.readingLocal')}</p>
          <Button variant="danger" size="sm" onClick={() => void clearHistory()}>
            {t('books.clearHistory')}
          </Button>
        </div>
      )}
    </div>
  );
}
