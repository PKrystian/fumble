import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Download, Sparkles, X } from 'lucide-react';
import { Button, IconButton, Select } from '@/features/ui/primitives';
import { inputClass } from '@/features/ui/styles';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useT } from '@/i18n/useT';
import { useSessionStore, type Session } from './store';
import {
  downloadJournalFile,
  formatSessionExport,
  hasExportContent,
  sessionExportFilename,
  type ExportLabels,
  type ExportScope,
} from './journal';

export function SessionExportDialog({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { t } = useT();
  const titleId = useId();
  const ref = useDialogFocus(true, onClose);
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const contexts = useSessionStore((state) => state.contexts);
  const [scope, setScope] = useState<ExportScope>('all');
  const [includeContext, setIncludeContext] = useState(true);
  const [copied, setCopied] = useState<'text' | 'prompt' | null>(null);
  const [feedback, setFeedback] = useState<
    'downloaded' | 'downloadError' | 'copyError' | null
  >(null);
  const labels: ExportLabels = {
    untitled: t('sessionLog.untitled'),
    campaign: t('sessionLog.campaign'),
    date: t('sessionLog.sessionDate'),
    number: t('sessionLog.sessionNumber'),
    notes: t('sessionLog.notesTab'),
    transcript: t('sessionLog.transcriptTab'),
    summary: t('sessionLog.summaryTab'),
    context: t('sessionLog.contextHeading'),
  };
  const options = { scope, includeContext, markdown: false, labels };
  const text = formatSessionExport(session, contexts, options);
  const enabled = hasExportContent(session, scope);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async (prompt: boolean) => {
    try {
      await navigator.clipboard.writeText(
        prompt
          ? `${t('sessionLog.summaryPrompt')}\n\n${t('sessionLog.contextInstruction')}\n\n${text}`
          : text,
      );
      setCopied(prompt ? 'prompt' : 'text');
      setFeedback(null);
    } catch {
      setFeedback('copyError');
      previewRef.current?.focus();
      previewRef.current?.select();
    }
  };
  const download = (extension: 'txt' | 'md') => {
    setCopied(null);
    try {
      downloadJournalFile(
        formatSessionExport(session, contexts, {
          ...options,
          markdown: extension === 'md',
        }),
        sessionExportFilename(session, extension),
        extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
      );
      setFeedback('downloaded');
    } catch {
      setFeedback('downloadError');
    }
  };
  return (
    <div className="dialog-overlay z-50" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-panel flex max-h-[90dvh] w-full max-w-3xl flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-700 p-4">
          <h2 id={titleId} className="section-title">
            {t('sessionLog.exportHeading')}
          </h2>
          <IconButton
            label={t('common.close')}
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="space-y-4 overflow-y-auto p-4">
          <div>
            <label className="field-label" htmlFor="session-export-scope">
              {t('sessionLog.exportScope')}
            </label>
            <Select
              id="session-export-scope"
              className="mt-2 w-full"
              value={scope}
              onChange={(event) => {
                setScope(event.target.value as ExportScope);
                setCopied(null);
                setFeedback(null);
              }}
            >
              {(['all', 'notes', 'transcript', 'summary'] as const).map((key) => (
                <option key={key} value={key}>
                  {t(`sessionLog.scope${key[0]!.toUpperCase()}${key.slice(1)}`)}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(event) => {
                setIncludeContext(event.target.checked);
                setCopied(null);
              }}
            />
            {t('sessionLog.includeContext')}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copy(false)} disabled={!enabled}>
              {copied === 'text' ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {t(copied === 'text' ? 'sessionLog.copied' : 'sessionLog.copyExport')}
            </Button>
            <Button
              onClick={() => void copy(true)}
              disabled={!enabled}
              title={t('sessionLog.copyWithAiPromptTitle')}
            >
              {copied === 'prompt' ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              {t(
                copied === 'prompt' ? 'sessionLog.copied' : 'sessionLog.copyWithAiPrompt',
              )}
            </Button>
            <Button onClick={() => download('txt')} disabled={!enabled}>
              <Download size={16} aria-hidden="true" />
              {t('sessionLog.downloadText')}
            </Button>
            <Button onClick={() => download('md')} disabled={!enabled}>
              <Download size={16} aria-hidden="true" />
              {t('sessionLog.downloadMarkdown')}
            </Button>
          </div>
          <p className="text-sm text-ink-400">{t('sessionLog.promptHelp')}</p>
          {!enabled && <p className="empty-state">{t('sessionLog.emptyExport')}</p>}
          {copied && (
            <p role="status" className="notice">
              {t('sessionLog.copied')}
            </p>
          )}
          {feedback && (
            <p
              role={feedback === 'downloaded' ? 'status' : 'alert'}
              className={feedback === 'downloaded' ? 'notice' : 'notice notice-error'}
            >
              {t(
                feedback === 'copyError'
                  ? 'common.clipboardError'
                  : `sessionLog.${feedback}`,
              )}
            </p>
          )}
          <div>
            <label className="field-label" htmlFor="session-export-preview">
              {t('sessionLog.exportPreview')}
            </label>
            <textarea
              ref={previewRef}
              id="session-export-preview"
              className={inputClass('mt-2 w-full resize-y font-mono text-sm')}
              rows={12}
              readOnly
              value={text}
            />
          </div>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-ink-700 p-4">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </footer>
      </section>
    </div>
  );
}
