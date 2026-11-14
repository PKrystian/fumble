import { useEffect, useId, useRef, useState } from 'react';
import { ClipboardPaste, Download, Upload } from 'lucide-react';
import { Button, Select } from '@/features/ui/primitives';
import { FormDialog } from '@/features/ui/FormDialog';
import { confirmDialog } from '@/features/ui/confirmStore';
import { inputClass, panelClass } from '@/features/ui/styles';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { useT } from '@/i18n/useT';
import { SUPPORTED_LOCALES, type Locale } from '@/i18n/locales';
import {
  homebrewBackupText,
  homebrewImportNames,
  HOMEBREW_FILE_BYTES,
  HomebrewFileError,
  previewHomebrewImport,
} from './homebrewFiles';
import { useHomebrewStore, withHomebrewWrite } from './store';

type Notice = (message: string, error?: boolean) => void;

function fileMessage(error: unknown) {
  return error instanceof HomebrewFileError
    ? `homebrew.fileErrors.${error.key}`
    : 'data.readError';
}

function downloadCurrent() {
  downloadTextFile(
    homebrewBackupText(useHomebrewStore.getState().entries),
    'fumble-homebrew-backup.json',
  );
}

export function HomebrewData({ notify }: { notify: Notice }) {
  const { t } = useT();
  const { status, raw, dirty } = useHomebrewStore();
  const [importing, setImporting] = useState(false);
  const blocked = status === 'conflict' || status === 'unreadable';

  useEffect(() => {
    useHomebrewStore.getState().checkStorage();
  }, []);

  const download = (original = false) => {
    try {
      if (original && raw !== null)
        downloadTextFile(raw, 'fumble-homebrew-original.json');
      else downloadCurrent();
      notify(t('data.exported'));
    } catch (error) {
      notify(
        t(error instanceof HomebrewFileError ? fileMessage(error) : 'data.exportError'),
        true,
      );
    }
  };

  const reload = async () => {
    if (
      dirty &&
      !(await confirmDialog(t('homebrew.confirmReload'), {
        tone: 'danger',
        confirmLabel: t('homebrew.reloadStored'),
        initialFocus: 'cancel',
      }))
    )
      return;
    if (useHomebrewStore.getState().loadStored()) notify(t('homebrew.reloaded'));
    else notify(t('homebrew.storageUnreadable'), true);
  };

  const replace = async () => {
    const accepted = await confirmDialog(t('homebrew.confirmReplace'), {
      tone: 'danger',
      confirmLabel: t('homebrew.replaceStored'),
      initialFocus: 'cancel',
    });
    if (!accepted) return;
    const replaced = await withHomebrewWrite(() => {
      const store = useHomebrewStore.getState();
      return store.restore(store.entries, raw);
    });
    notify(t(replaced ? 'homebrew.saved' : 'homebrew.restoreFailed'), !replaced);
  };

  const retry = async () => {
    const saved = await withHomebrewWrite(() => useHomebrewStore.getState().retry());
    notify(t(saved ? 'homebrew.saved' : 'homebrew.restoreFailed'), !saved);
  };

  return (
    <>
      {status !== 'saved' && (
        <section className="notice space-y-3" data-tone="error">
          <p role="alert">
            {t(
              status === 'conflict'
                ? 'homebrew.storageConflict'
                : status === 'unreadable'
                  ? 'homebrew.storageUnreadable'
                  : 'homebrew.storageUnsaved',
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {status === 'unsaved' && (
              <Button onClick={() => void retry()}>{t('homebrew.retrySave')}</Button>
            )}
            <Button onClick={() => download()}>{t('homebrew.downloadCurrent')}</Button>
            {raw !== null && (
              <Button onClick={() => download(true)}>
                {t('homebrew.downloadOriginal')}
              </Button>
            )}
            {status === 'conflict' && (
              <Button onClick={() => void reload()}>{t('homebrew.reloadStored')}</Button>
            )}
            {blocked && (
              <Button variant="danger" onClick={() => void replace()}>
                {t('homebrew.replaceStored')}
              </Button>
            )}
          </div>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setImporting(true)} disabled={blocked}>
          <Upload size={16} aria-hidden="true" /> {t('homebrew.import')}
        </Button>
        <Button onClick={() => download()} disabled={blocked}>
          <Download size={16} aria-hidden="true" /> {t('homebrew.export')}
        </Button>
      </div>
      {importing && (
        <HomebrewFileDialog onClose={() => setImporting(false)} notify={notify} />
      )}
    </>
  );
}

interface Selection {
  file: string;
  text: string;
  preview: ReturnType<typeof previewHomebrewImport>;
  baseline: string | null;
}

function HomebrewFileDialog({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: Notice;
}) {
  const { t, locale } = useT();
  const [sourceLocale, setSourceLocale] = useState<Locale>(locale);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<Selection>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLHeadingElement>(null);
  const token = useRef(0);
  const pasteId = useId();

  useEffect(
    () => () => {
      token.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (selected) previewRef.current?.focus();
  }, [selected]);

  const read = (value: string, file: string, language = sourceLocale) => {
    setError('');
    setSelected(undefined);
    setPreviewFailed(false);
    try {
      const store = useHomebrewStore.getState();
      const canWrite = store.checkStorage();
      const baseline = canWrite ? store.baseline() : useHomebrewStore.getState().raw;
      const selection: Selection = {
        file,
        text: value,
        preview: previewHomebrewImport(value, language, store.entries),
        baseline,
      };
      setSelected(selection);
    } catch (failure) {
      setError(t(fileMessage(failure)));
      setPreviewFailed(true);
    }
  };

  const selectFile = async (file: File) => {
    const request = ++token.current;
    setSelected(undefined);
    setBusy(true);
    setError('');
    try {
      if (file.size > HOMEBREW_FILE_BYTES) throw new HomebrewFileError('tooLarge');
      const value = await file.text();
      if (request === token.current) read(value, file.name);
    } catch (failure) {
      if (request === token.current) setError(t(fileMessage(failure)));
    } finally {
      if (request === token.current) setBusy(false);
    }
  };

  const apply = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const entries = selected.preview.entries;
      const added = await withHomebrewWrite(() => {
        const store = useHomebrewStore.getState();
        return store.baseline() === selected.baseline && store.append(entries);
      });
      if (!added) {
        setError(t('homebrew.editorSaveBlocked'));
        return;
      }
      if (useHomebrewStore.getState().status === 'saved')
        notify(
          t(
            entries.length === 1
              ? 'homebrew.importedOwnOne'
              : 'homebrew.importedOwnOther',
            { count: entries.length },
          ),
        );
      onClose();
    } catch {
      setError(t('homebrew.restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const empty = selected?.preview.entries.length === 0;

  return (
    <FormDialog
      title={t('homebrew.importTitle')}
      onClose={() => {
        if (!busy) onClose();
      }}
      actions={
        <>
          <Button onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          {selected && (
            <Button
              variant="primary"
              onClick={() => void apply()}
              disabled={busy || empty}
            >
              {t('homebrew.addImport')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="field-label">
            {t('homebrew.importLanguage')}
            <Select
              value={sourceLocale}
              onChange={(event) => {
                const language = event.target.value as Locale;
                setSourceLocale(language);
                if (selected?.preview.format === '5etools')
                  read(selected.text, selected.file, language);
              }}
              disabled={busy}
            >
              {SUPPORTED_LOCALES.map(({ code, nativeLabel }) => (
                <option key={code} value={code}>
                  {nativeLabel}
                </option>
              ))}
            </Select>
          </label>

          <Button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            data-dialog-focus
          >
            <Upload size={16} aria-hidden="true" /> {t('homebrew.importFile')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void selectFile(file);
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="field-label">
            {t('homebrew.pastePlaceholderLabel')}
            <textarea
              className={inputClass('resize-y font-mono')}
              rows={5}
              spellCheck={false}
              value={text}
              aria-invalid={previewFailed || undefined}
              aria-describedby={previewFailed ? pasteId : undefined}
              disabled={busy}
              onChange={(event) => {
                setText(event.target.value);
                setSelected(undefined);
                setError('');
                setPreviewFailed(false);
              }}
            />
          </label>
          <Button
            onClick={() => read(text, t('homebrew.pastedSource'))}
            disabled={busy || !text.trim()}
          >
            <ClipboardPaste size={16} aria-hidden="true" /> {t('homebrew.previewPaste')}
          </Button>
        </div>

        {busy && (
          <p role="status" className="notice">
            {t('data.processing')}
          </p>
        )}
        {error && (
          <p role="alert" id={pasteId} className="notice" data-tone="error">
            {error}
          </p>
        )}
        {selected && (
          <section className={panelClass('space-y-3 p-4')}>
            <h3 ref={previewRef} tabIndex={-1} className="section-title">
              {t('homebrew.previewTitle')}
            </h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-ink-400">{t('data.filename')}</dt>
                <dd className="[overflow-wrap:anywhere]">{selected.file}</dd>
              </div>
              <div>
                <dt className="text-ink-400">{t('data.counts.homebrew')}</dt>
                <dd>{selected.preview.entries.length}</dd>
              </div>
              <div>
                <dt className="text-ink-400">{t('homebrew.fileFormat')}</dt>
                <dd>
                  {t(
                    selected.preview.format === 'fumble'
                      ? 'homebrew.formatFumble'
                      : 'homebrew.fiveToolsHomebrew',
                  )}
                </dd>
              </div>

              {selected.preview.exportedAt && (
                <div>
                  <dt className="text-ink-400">{t('data.exportedAt')}</dt>
                  <dd>
                    <time dateTime={selected.preview.exportedAt}>
                      {new Date(selected.preview.exportedAt).toLocaleString(locale)}
                    </time>
                  </dd>
                </div>
              )}
              {selected.preview.version !== null && (
                <div>
                  <dt className="text-ink-400">{t('data.fileVersion')}</dt>
                  <dd>{selected.preview.version}</dd>
                </div>
              )}
              {selected.preview.locale && (
                <div>
                  <dt className="text-ink-400">{t('homebrew.sourceLanguage')}</dt>
                  <dd>
                    {
                      SUPPORTED_LOCALES.find(
                        ({ code }) => code === selected.preview.locale,
                      )?.nativeLabel
                    }
                  </dd>
                </div>
              )}
            </dl>
            <div className="space-y-1 text-sm text-ink-300" role="status">
              {empty && <p>{t('homebrew.noImportable')}</p>}
              {!empty && (
                <p className="[overflow-wrap:anywhere]">
                  {t('homebrew.importExamples', {
                    names: homebrewImportNames(selected.preview.entries),
                  })}
                </p>
              )}
              {selected.preview.duplicates > 0 && (
                <p>
                  {t('homebrew.importDuplicates', {
                    count: selected.preview.duplicates,
                  })}
                </p>
              )}
              {selected.preview.invalid > 0 && (
                <p>{t('homebrew.importInvalid', { count: selected.preview.invalid })}</p>
              )}
              {selected.preview.unsupported > 0 && (
                <p>
                  {t('homebrew.importUnsupported', {
                    count: selected.preview.unsupported,
                  })}
                </p>
              )}
              {selected.preview.copied > 0 && (
                <p>{t('homebrew.importCopies', { count: selected.preview.copied })}</p>
              )}
            </div>
          </section>
        )}
      </div>
    </FormDialog>
  );
}
