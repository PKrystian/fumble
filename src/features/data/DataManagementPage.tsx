import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import {
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
} from './backup';

type Status = 'idle' | 'exported' | 'invalid' | 'storage-error';

export function DataManagementPage() {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  useSeo(t('seo.pageTitles.data'), t('seo.pageDescriptions.data'), false);

  const exportData = () => {
    try {
      const blob = new Blob([serializeBackup(createBackup(localStorage))], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backupFilename();
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus('exported');
    } catch {
      setStatus('storage-error');
    }
  };

  const importData = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      const accepted = await confirmDialog(t('data.importConfirm'), {
        confirmLabel: t('data.importAction'),
        tone: 'danger',
      });
      if (!accepted) return;
      restoreBackup(localStorage, backup);
      window.location.reload();
    } catch (error) {
      setStatus(
        error instanceof SyntaxError ||
          (error instanceof Error && error.message.startsWith('backup-'))
          ? 'invalid'
          : 'storage-error',
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink-50">{t('data.title')}</h1>
      <p className="mt-3 text-ink-200">{t('data.description')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className={panelClass('border-ink-700 p-5')}>
          <Download size={24} className="text-arcane-300" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-bold text-ink-50">
            {t('data.exportTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{t('data.exportBody')}</p>
          <Button onClick={exportData} variant="primary" className="mt-5">
            {t('data.exportAction')}
          </Button>
        </section>

        <section className={panelClass('border-ink-700 p-5')}>
          <Upload size={24} className="text-ember-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-xl font-bold text-ink-50">
            {t('data.importTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{t('data.importBody')}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importData(file);
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            className="mt-5 border-ember-500 text-ember-400"
          >
            {t('data.importAction')}
          </Button>
        </section>
      </div>

      <div className="mt-5 min-h-6" aria-live="polite">
        {status === 'exported' && (
          <p className="text-sm text-green-400">{t('data.exported')}</p>
        )}
        {status === 'invalid' && (
          <p role="alert" className="text-sm text-red-400">
            {t('data.invalid')}
          </p>
        )}
        {status === 'storage-error' && (
          <p role="alert" className="text-sm text-red-400">
            {t('data.storageError')}
          </p>
        )}
      </div>
    </div>
  );
}
