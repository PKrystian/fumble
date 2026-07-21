import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mic, Plus, Sparkles, Square, Trash2 } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useSpeechRecognition } from './speech';
import {
  formatClockTime,
  formatDuration,
  formatPromptWithTranscript,
  formatTranscriptForExport,
  useSessionStore,
} from './store';

export function SessionLogPage() {
  const { t } = useT();
  useSeo(t('nav.sessionLog'));
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

  const createSession = () => setSelectedId(addSession());

  const copyTranscript = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(formatTranscriptForExport(session));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyWithPrompt = async () => {
    if (!session) return;
    await navigator.clipboard.writeText(formatPromptWithTranscript(session));
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  };

  const liveDuration =
    (session?.durationMs ?? 0) +
    (listening && recordStart.current ? Date.now() - recordStart.current : 0);

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-ink-700">
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h1 className="font-display text-lg font-bold text-ink-50">
            {t('sessionLog.sessions')}
          </h1>
          <button
            type="button"
            onClick={createSession}
            aria-label={t('sessionLog.newSession')}
            className="rounded-md bg-arcane-700 p-1.5 text-ink-50 hover:bg-arcane-500"
          >
            <Plus size={16} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={[
                  'block w-full border-b border-ink-800 px-3 py-2 text-left',
                  s.id === selectedId ? 'bg-ink-800' : 'hover:bg-ink-900',
                ].join(' ')}
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

      <main className="min-w-0 flex-1 overflow-y-auto p-5">
        {!session ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-300">
            <p>{t('sessionLog.noSessionSelected')}</p>
            <button
              type="button"
              onClick={createSession}
              className="rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-500"
            >
              {t('sessionLog.startNewSession')}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <input
                value={session.title}
                onChange={(e) => updateSession(session.id, { title: e.target.value })}
                className="flex-1 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 font-display text-xl font-bold text-ink-50 focus:border-arcane-500 focus:outline-none"
              />
              <button
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
                className="rounded p-2 text-ink-400 hover:bg-ink-800 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {supported ? (
                <>
                  <button
                    type="button"
                    onClick={listening ? stopRecording : startRecording}
                    className={[
                      'inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-ink-50',
                      listening
                        ? 'bg-red-700 hover:bg-red-600'
                        : 'bg-arcane-700 hover:bg-arcane-500',
                    ].join(' ')}
                  >
                    {listening ? <Square size={16} /> : <Mic size={16} />}
                    {listening ? t('sessionLog.stop') : t('sessionLog.record')}
                  </button>
                  <select
                    value={transcriptionLang}
                    onChange={(e) => setTranscriptionLang(e.target.value)}
                    disabled={listening}
                    aria-label={t('sessionLog.transcriptionLanguage')}
                    className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-200 focus:border-arcane-500 focus:outline-none disabled:opacity-50"
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
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyTranscript}
                  disabled={session.entries.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-sm font-medium text-ink-100 hover:bg-ink-800 disabled:opacity-50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('sessionLog.copied') : t('sessionLog.copyTranscript')}
                </button>
                <button
                  type="button"
                  onClick={copyWithPrompt}
                  disabled={session.entries.length === 0}
                  title={t('sessionLog.copyWithAiPromptTitle')}
                  className="inline-flex items-center gap-2 rounded-lg bg-arcane-700 px-3 py-1.5 text-sm font-medium text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
                >
                  {promptCopied ? <Check size={16} /> : <Sparkles size={16} />}
                  {promptCopied
                    ? t('sessionLog.copied')
                    : t('sessionLog.copyWithAiPrompt')}
                </button>
              </div>
            </div>

            {interim && (
              <p className="flex items-center gap-2 text-sm text-ink-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-arcane-500" />
                {interim}
              </p>
            )}

            <div className="flex min-h-[20rem] flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-3">
              {session.entries.length === 0 ? (
                <p className="text-ink-500">{t('sessionLog.transcriptEmptyState')}</p>
              ) : (
                session.entries.map((entry, i) => (
                  <p key={`${entry.time}-${i}`} className="leading-relaxed text-ink-100">
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
      </main>
    </div>
  );
}
