import { useEffect, useRef, useState } from 'react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { MAX_BACKUP_BYTES } from './backup';
import { CharacterBackupRow } from './CharacterBackupRow';
import { TOOL_BACKUPS, type ToolBackup, type ToolRestore } from './toolBackupAdapters';

interface Preview {
  tool: ToolBackup;
  filename: string;
  restore: ToolRestore;
}
interface Feedback {
  text: string;
  error: boolean;
}

export function ToolBackups({ onChange }: { onChange: () => void }) {
  const { t, locale } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pending = useRef<ToolBackup | null>(null);
  const operation = useRef(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [emptyAccepted, setEmptyAccepted] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(
    () => () => {
      operation.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (preview) headingRef.current?.focus();
  }, [preview]);

  const name = (tool: ToolBackup) => t(tool.labelKey);
  const report = (key: string, tool: ToolBackup, error = false) =>
    setFeedback({ text: t(key, { tool: name(tool) }), error });

  const download = (tool: ToolBackup) => {
    try {
      tool.download();
      report('data.tools.downloaded', tool);
    } catch {
      report('data.tools.downloadError', tool, true);
    }
  };

  const selectFile = async (tool: ToolBackup, file: File) => {
    const token = ++operation.current;
    setBusy(true);
    setPreview(null);
    setEmptyAccepted(false);
    setFeedback(null);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');
      const text = await file.text();
      if (token === operation.current)
        setPreview({ tool, filename: file.name, restore: tool.parse(text, t) });
    } catch {
      if (token === operation.current) report('data.tools.invalid', tool, true);
    } finally {
      if (token === operation.current) setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restore = async ({ tool, filename, restore: selected }: Preview) => {
    const token = ++operation.current;
    setBusy(true);
    const accepted = await confirmDialog(
      t('data.tools.confirm', { tool: name(tool), filename }),
      {
        title: t('data.confirmTitle'),
        confirmLabel: t('data.tools.restoreAction'),
        tone: 'danger',
        initialFocus: 'cancel',
      },
    );
    if (token !== operation.current) return;
    if (accepted) {
      let restored: boolean;
      try {
        restored = await selected.apply();
      } catch {
        restored = false;
      }
      if (token !== operation.current) return;
      if (restored) {
        setPreview(null);
        onChange();
      }
      report(
        restored ? 'data.tools.restored' : 'data.tools.restoreFailed',
        tool,
        !restored,
      );
    }
    setBusy(false);
  };

  return (
    <section className={panelClass('mt-6 p-5')} aria-labelledby="tool-backups-title">
      <h2 id="tool-backups-title" className="section-title">
        {t('data.tools.title')}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-300">{t('data.tools.description')}</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t('data.tools.restore')}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && pending.current) void selectFile(pending.current, file);
        }}
      />
      <ul className="mt-4 divide-y divide-ink-800">
        <CharacterBackupRow
          busy={busy}
          notify={(text, error = false) => setFeedback({ text, error })}
          onChange={onChange}
        />
        {TOOL_BACKUPS.map((tool) => {
          const available = tool.available();
          return (
            <li
              key={tool.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1 basis-48">
                <Link to={tool.to} className="font-semibold text-ink-50 hover:underline">
                  {name(tool)}
                </Link>
                <p className="text-sm text-ink-400">
                  {available
                    ? `${t(tool.countKey)}: ${tool.count()}`
                    : t('data.tools.unavailable')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !available}
                  aria-label={t('data.tools.downloadNamed', { tool: name(tool) })}
                  onClick={() => download(tool)}
                >
                  {t('data.tools.download')}
                </Button>
                <Button
                  size="sm"
                  disabled={busy || !available}
                  aria-label={t('data.tools.restoreNamed', { tool: name(tool) })}
                  onClick={() => {
                    pending.current = tool;
                    inputRef.current?.click();
                  }}
                >
                  {t('data.tools.restore')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {preview && (
        <div
          className={panelClass('mt-4 space-y-4 p-4')}
          role="group"
          aria-labelledby="tool-backup-preview"
          aria-busy={busy}
        >
          <h3
            id="tool-backup-preview"
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-ink-50"
          >
            {t('data.tools.previewTitle', { tool: name(preview.tool) })}
          </h3>
          <dl className="grid gap-3 text-sm [overflow-wrap:anywhere] sm:grid-cols-2">
            <div>
              <dt className="field-label">{t('data.filename')}</dt>
              <dd>{preview.filename}</dd>
            </div>
            {preview.restore.exportedAt && (
              <div>
                <dt className="field-label">{t('data.exportedAt')}</dt>
                <dd>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(preview.restore.exportedAt))}
                </dd>
              </div>
            )}
            {preview.restore.version !== null && (
              <div>
                <dt className="field-label">{t('data.fileVersion')}</dt>
                <dd>{preview.restore.version}</dd>
              </div>
            )}
            {preview.restore.details.map((row) => (
              <div key={row.label}>
                <dt className="field-label">{row.label}</dt>
                <dd className="tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="notice notice-warning">{t(preview.tool.scopeKey)}</p>
          <Button disabled={busy} onClick={() => download(preview.tool)}>
            {t('data.tools.safety', { tool: name(preview.tool) })}
          </Button>
          {preview.restore.empty && (
            <label className="flex cursor-pointer items-start gap-3 py-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={emptyAccepted}
                disabled={busy}
                onChange={(event) => setEmptyAccepted(event.target.checked)}
                className="mt-1 accent-arcane-500"
              />
              <span>{t(preview.tool.emptyKey)}</span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={busy || (preview.restore.empty && !emptyAccepted)}
              onClick={() => void restore(preview)}
            >
              {t('data.tools.restoreAction')}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setFeedback(null);
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      <div className="mt-4 min-h-6" aria-live="polite" aria-atomic="true">
        {busy && <p className="notice">{t('data.processing')}</p>}
        {feedback && (
          <p
            role={feedback.error ? 'alert' : undefined}
            className={feedback.error ? 'notice notice-error' : 'notice notice-success'}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </section>
  );
}
