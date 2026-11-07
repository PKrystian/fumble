import { Button } from '@/features/ui/primitives';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, List, Mic, Plus, Sparkles, Square, Trash2, X } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useSpeechRecognition } from './speech';
import {
  formatClockTime,
  formatDuration,
  formatPromptWithTranscript,
  formatTranscriptForExport,
  useSessionStore,
} from './store';

export function SessionLogPage() {
  const { locale, t } = useT();
  useSeo(t('seo.pageTitles.sessionLog'), t('seo.pageDescriptions.sessionLog'), false);
  const sessions = useSessionStore((s) => s.sessions);
  const addSession = useSessionStore((s) => s.addSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const appendTranscript = useSessionStore((s) => s.appendTranscript);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const transcriptionLang = useSessionStore((s) => s.transcriptionLang);
  const setTranscriptionLang = useSessionStore((s) => s.setTranscriptionLang);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const sessionsDialogRef = useDialogFocus(mobileSessionsOpen, () =>
    setMobileSessionsOpen(false),
  );
  const recordStart = useRef<number | null>(null);

  const session = sessions.find((s) => s.id === selectedId) ?? null;

  const { supported, listening, interim, speechError, start, stop } =
    useSpeechRecognition((text) => {
      if (selectedId) appendTranscript(selectedId, text);
    }, transcriptionLang);

  useEffect(() => {
    if (!selectedId && sessions.length > 0) setSelectedId(sessions[0]!.id);
  }, [selectedId, sessions]);

  useEffect(() => {
    if (!listening) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [listening]);

  const startRecording = () => {
    recordStart.current = Date.now();
    void start();
  };
  const stopRecording = () => {
    stop();
    if (session && recordStart.current) {
      updateSession(session.id, {
        durationMs: session.durationMs + (Date.now() - recordStart.current),
      });
    }
    recordStart.current = null;
  };

  const createSession = () => {
    const date = new Date().toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US');
    setSelectedId(addSession(t('sessionLog.newSessionTitle', { date })));
    setMobileSessionsOpen(false);
  };

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(
        formatTranscriptForExport(session!, t('sessionLog.notesLabel')),
      );
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError(true);
    }
  };

  const copyWithPrompt = async () => {
    try {
      await navigator.clipboard.writeText(
        formatPromptWithTranscript(
          session!,
          t('sessionLog.summaryPrompt'),
          t('sessionLog.notesLabel'),
        ),
      );
      setPromptCopied(true);
      setCopyError(false);
      setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      setCopyError(true);
    }
  };

  const liveDuration =
    (session?.durationMs ?? 0) +
    (listening && recordStart.current ? Date.now() - recordStart.current : 0);

  return (
    <div className="relative flex h-full min-h-0">
      {mobileSessionsOpen && (
        <button
          type="button"
          aria-label={t('common.closeMenu')}
          className="absolute inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setMobileSessionsOpen(false)}
        />
      )}

      <aside
        ref={sessionsDialogRef}
        tabIndex={-1}
        role={mobileSessionsOpen ? 'dialog' : undefined}
        aria-modal={mobileSessionsOpen || undefined}
        aria-label={t('sessionLog.sessions')}
        className={[
          'absolute inset-y-0 left-0 z-30 flex w-[min(20rem,85vw)] shrink-0 flex-col border-r border-ink-700 bg-ink-950 shadow-xl transition-transform md:static md:w-64 md:translate-x-0 md:shadow-none',
          mobileSessionsOpen
            ? 'translate-x-0 visible'
            : '-translate-x-full invisible md:visible',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h2 className="section-title">{t('sessionLog.sessions')}</h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={createSession}
              aria-label={t('sessionLog.newSession')}
              variant="primary"
              size="sm"
              iconOnly
            >
              <Plus size={18} />
            </Button>
            <Button
              type="button"
              onClick={() => setMobileSessionsOpen(false)}
              aria-label={t('common.closeMenu')}
              variant="ghost"
              size="sm"
              iconOnly
              className="md:hidden"
            >
              <X size={20} />
            </Button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(s.id);
                  setMobileSessionsOpen(false);
                }}
                aria-pressed={s.id === selectedId}
                className="selection-row rounded-none border-b border-ink-800"
              >
                <span className="block truncate text-sm font-medium text-ink-50">
                  {s.title}
                </span>
                <span className="text-xs text-ink-400">
                  {formatDuration(s.durationMs)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <h1 className="page-title mb-6">{t('nav.sessionLog')}</h1>
        {!session ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-300">
            <p>{t('sessionLog.noSessionSelected')}</p>
            <Button type="button" onClick={createSession} variant="primary">
              {t('sessionLog.startNewSession')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4 page-shell">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                onClick={() => setMobileSessionsOpen(true)}
                aria-label={t('sessionLog.sessions')}
                variant="secondary"
                size="sm"
                iconOnly
                className="shrink-0 md:hidden"
              >
                <List size={20} />
              </Button>
              <input
                value={session.title}
                aria-label={t('sessionLog.sessionTitle')}
                onChange={(e) => updateSession(session.id, { title: e.target.value })}
                className="ui-field min-w-0 flex-1 font-display text-lg font-bold sm:text-xl"
              />
              <Button
                type="button"
                aria-label={t('sessionLog.deleteSession')}
                onClick={async () => {
                  const ok = await confirmDialog(t('sessionLog.deleteSessionConfirm'), {
                    tone: 'danger',
                    confirmLabel: t('common.delete'),
                  });
                  if (ok) {
                    deleteSession(session.id);
                    setSelectedId(null);
                  }
                }}
                variant="ghost"
                size="sm"
                iconOnly
              >
                <Trash2 size={18} />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {supported ? (
                <>
                  <Button
                    type="button"
                    onClick={listening ? stopRecording : startRecording}
                    variant={listening ? 'danger' : 'primary'}
                  >
                    {listening ? <Square size={16} /> : <Mic size={16} />}
                    {listening ? t('sessionLog.stop') : t('sessionLog.record')}
                  </Button>
                  <select
                    value={transcriptionLang}
                    onChange={(e) => setTranscriptionLang(e.target.value)}
                    disabled={listening}
                    aria-label={t('sessionLog.transcriptionLanguage')}
                    className="ui-field min-w-0 flex-1 sm:flex-none"
                  >
                    <option value="english">{t('sessionLog.english')}</option>
                    <option value="polish">{t('sessionLog.polish')}</option>
                  </select>
                </>
              ) : (
                <span className="text-sm text-ink-400">
                  {t('sessionLog.voiceNotSupported')}
                </span>
              )}
              <span className="font-mono text-lg text-ink-200">
                {formatDuration(liveDuration)}
              </span>
              {listening && (
                <span className="flex items-center gap-1 text-sm text-red-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{' '}
                  {t('sessionLog.recording')}
                </span>
              )}
              <div className="flex w-full items-stretch gap-2 sm:ml-auto sm:w-auto sm:items-center">
                <Button
                  type="button"
                  onClick={copyTranscript}
                  disabled={session.entries.length === 0}
                  variant="secondary"
                  size="sm"
                  className="min-w-0 flex-1 sm:flex-none"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('sessionLog.copied') : t('sessionLog.copyTranscript')}
                </Button>
                <Button
                  type="button"
                  onClick={copyWithPrompt}
                  disabled={session.entries.length === 0}
                  title={t('sessionLog.copyWithAiPromptTitle')}
                  variant="primary"
                  size="sm"
                  className="min-w-0 flex-1 sm:flex-none"
                >
                  {promptCopied ? <Check size={16} /> : <Sparkles size={16} />}
                  {promptCopied
                    ? t('sessionLog.copied')
                    : t('sessionLog.copyWithAiPrompt')}
                </Button>
              </div>
              {copyError && (
                <span role="alert" className="w-full text-xs text-red-300 sm:w-auto">
                  {t('common.clipboardError')}
                </span>
              )}
            </div>

            {interim && (
              <p className="flex items-center gap-2 text-sm text-ink-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-arcane-500" />
                {interim}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="session-notes"
                className="text-sm font-semibold text-ink-200"
              >
                {t('sessionLog.notes')}
              </label>
              <textarea
                id="session-notes"
                value={session.notes}
                onChange={(event) =>
                  updateSession(session.id, { notes: event.target.value })
                }
                rows={4}
                placeholder={t('sessionLog.notesPlaceholder')}
                className="ui-field w-full resize-y"
              />
            </div>

            <div className="flex min-h-[16rem] flex-col gap-2 overflow-hidden rounded-lg border border-ink-700 bg-ink-900 p-3 sm:min-h-[20rem]">
              {session.entries.length === 0 ? (
                <p className="text-ink-500">{t('sessionLog.transcriptEmptyState')}</p>
              ) : (
                session.entries.map((entry, i) => (
                  <p
                    key={`${entry.time}-${i}`}
                    className="break-words leading-relaxed text-ink-100"
                  >
                    <span className="mr-2 font-mono text-xs text-ink-500">
                      [{formatClockTime(entry.time)}]
                    </span>
                    {entry.text}
                  </p>
                ))
              )}
            </div>

            {speechError && <p className="text-sm text-red-400">{speechError}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
