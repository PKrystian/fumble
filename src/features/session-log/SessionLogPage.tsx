import { useId, useState } from 'react';
import { Copy, List, Mic, Plus, Square, Trash2, X } from 'lucide-react';
import {
  Button,
  IconButton,
  Select,
  TextInput,
  ToggleChip,
} from '@/features/ui/primitives';
import { inputClass, panelClass } from '@/features/ui/styles';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { backupFilename } from '@/features/data/backup';
import { useSpeechRecognition, type SpeechMode } from './speech';
import {
  formatDuration,
  reloadStoredSessions,
  replaceStoredSessions,
  retrySessionSave,
  sessionDateValue,
  useSessionStore,
  type Session,
} from './store';
import { useSessionSaveStatus } from './persistence';
import { CampaignContextsDialog, SessionContextPanel } from './CampaignContexts';
import { SessionList, type JournalListView } from './SessionList';
import { SessionExportDialog } from './SessionExportDialog';
import { TranscriptPanel } from './TranscriptPanel';
import { RecordingNavigationGuard } from './RecordingNavigationGuard';
import { createJournalBackup } from './journalBackup';
import { downloadJournalFile } from './journal';

export function SessionLogPage() {
  const { locale, t } = useT();
  useSeo(t('seo.pageTitles.sessionLog'), t('seo.pageDescriptions.sessionLog'), false);
  const sessions = useSessionStore((state) => state.sessions);
  const selectedId = useSessionStore((state) => state.selectedSessionId);
  const revision = useSessionStore((state) => state.revision);
  const transcriptionLang = useSessionStore((state) => state.transcriptionLang);
  const mode = useSessionStore((state) => state.transcriptionMode);
  const session = sessions.find((item) => item.id === selectedId) ?? sessions[0] ?? null;
  const lang = transcriptionLang || (locale === 'pl' ? 'polish' : 'english');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contextsOpen, setContextsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [tab, setTab] = useState<'notes' | 'transcript' | 'summary'>('notes');
  const saveStatus = useSessionSaveStatus();
  const saved = saveStatus.state === 'saved';
  const [backupError, setBackupError] = useState(false);
  const [deleted, setDeleted] = useState<{ session: Session; index: number } | null>(
    null,
  );
  const [view, setView] = useState<JournalListView>({
    query: '',
    campaign: '',
    sort: 'updated',
    direction: 'desc',
    page: 1,
  });
  const mobileTitleId = useId();
  const mobileRef = useDialogFocus(mobileOpen, () => setMobileOpen(false));
  const speech = useSpeechRecognition(
    (text, stamp) => {
      if (!session) return;
      useSessionStore.getState().appendTranscript(session.id, text, {
        time: stamp.time,
        offsetMs: session.durationMs + stamp.offsetMs,
      });
    },
    lang,
    {
      mode,
      onDuration: (ms) => {
        if (session) useSessionStore.getState().addDuration(session.id, ms);
      },
    },
  );
  const captureOwner = sessions.find((item) => item.id === ownerId);
  const selectedOwnsCapture = speech.busy && ownerId === session?.id;
  const captureExtra = speech.listening && ownerId === session?.id ? speech.elapsedMs : 0;

  const createSession = () => {
    const date = new Date().toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US');
    useSessionStore.getState().addSession(t('sessionLog.newSessionTitle', { date }));
    setMobileOpen(false);
    setTab('notes');
    setView((current) => ({ ...current, query: '', campaign: '', page: 1 }));
  };
  const onSelect = (id: string) => {
    useSessionStore.getState().selectSession(id);
    setMobileOpen(false);
  };
  const onView = (patch: Partial<JournalListView>) =>
    setView((current) => ({ ...current, ...patch }));
  const listProps = { sessions, selectedId: session?.id ?? null, view, onView, onSelect };
  const discard = async () => {
    if (
      await confirmDialog(t('sessionLog.discardPendingConfirm'), {
        tone: 'danger',
        confirmLabel: t('sessionLog.discardPending'),
        initialFocus: 'cancel',
      })
    )
      speech.discardPending();
  };
  const emergencyBackup = () => {
    try {
      downloadJournalFile(
        createJournalBackup(window.localStorage),
        backupFilename(),
        'application/json',
      );
      setBackupError(false);
    } catch {
      setBackupError(true);
    }
  };
  const downloadOriginal = () => {
    try {
      downloadJournalFile(
        saveStatus.raw ?? '',
        'fumble-sessions-original.json',
        'application/json',
      );
      setBackupError(false);
    } catch {
      setBackupError(true);
    }
  };
  const confirmStorage = async (message: string, label: string, action: () => void) => {
    const accepted = await confirmDialog(t(message), {
      confirmLabel: t(label),
      tone: 'danger',
      initialFocus: 'cancel',
    });
    if (accepted) action();
  };
  return (
    <div className="page-shell page-shell-wide">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t('nav.sessionLog')}</h1>
          <p className="page-description">{t('sessionLog.description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setContextsOpen(true)}>
            {t('sessionLog.contextManage')}
          </Button>
          {session && (
            <Button onClick={createSession}>
              <Plus size={16} aria-hidden="true" />
              {t('sessionLog.newSession')}
            </Button>
          )}
        </div>
      </header>
      <p role="status" className="mb-4 text-xs text-ink-400">
        {saved ? t('sessionLog.saved') : t('common.storageError')}
      </p>
      {!saved && (
        <div role="alert" className="notice notice-error mb-6 space-y-3">
          <p>
            {t(
              saveStatus.state === 'unreadable'
                ? 'sessionLog.storageUnreadable'
                : saveStatus.state === 'conflict'
                  ? 'sessionLog.storageConflict'
                  : 'sessionLog.saveError',
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {saveStatus.state === 'unsaved' && (
              <Button onClick={retrySessionSave}>{t('sessionLog.retrySave')}</Button>
            )}
            {saveStatus.state === 'conflict' && (
              <Button
                onClick={() =>
                  void confirmStorage(
                    'sessionLog.confirmReload',
                    'sessionLog.reloadStored',
                    reloadStoredSessions,
                  )
                }
              >
                {t('sessionLog.reloadStored')}
              </Button>
            )}
            <Button onClick={emergencyBackup}>{t('sessionLog.emergencyBackup')}</Button>
            {saveStatus.raw !== null && (
              <Button onClick={downloadOriginal}>
                {t('sessionLog.downloadOriginal')}
              </Button>
            )}
            {session && (
              <Button onClick={() => setExportOpen(true)}>
                {t('sessionLog.exportHeading')}
              </Button>
            )}
            {saveStatus.state !== 'unsaved' && (
              <Button
                variant="danger"
                onClick={() =>
                  void confirmStorage(
                    'sessionLog.confirmReplace',
                    'sessionLog.replaceStored',
                    replaceStoredSessions,
                  )
                }
              >
                {t('sessionLog.replaceStored')}
              </Button>
            )}
            <Link className="document-link" to="/data">
              {t('nav.data')}
            </Link>
          </div>
          {backupError && <p>{t('sessionLog.emergencyError')}</p>}
        </div>
      )}
      {deleted && (
        <div
          role="status"
          className="notice mb-5 flex flex-wrap items-center justify-between gap-2"
        >
          <span>{t('sessionLog.sessionDeleted')}</span>
          <Button
            onClick={() => {
              useSessionStore.getState().restoreSession(deleted.session, deleted.index);
              setDeleted(null);
            }}
          >
            {t('sessionLog.undo')}
          </Button>
        </div>
      )}
      <div className="grid min-w-0 gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden self-start md:sticky md:top-4 md:block">
          <h2 className="section-title mb-4">{t('sessionLog.sessions')}</h2>
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1">
            <SessionList {...listProps} />
          </div>
        </aside>
        <section className="min-w-0">
          <Button className="mb-4 md:hidden" onClick={() => setMobileOpen(true)}>
            <List size={16} aria-hidden="true" />
            {t('sessionLog.sessionsCount', { count: sessions.length })}
          </Button>
          {!session ? (
            <div
              className={panelClass('flex flex-col items-center gap-4 p-6 text-center')}
            >
              <p className="empty-state">{t('sessionLog.noSessionSelected')}</p>
              <Button onClick={createSession} variant="primary">
                <Plus size={16} aria-hidden="true" />
                {t('sessionLog.startNewSession')}
              </Button>
            </div>
          ) : (
            <div className="min-w-0 space-y-6">
              <section className={panelClass('space-y-4 p-4')}>
                <div>
                  <label className="field-label" htmlFor="session-title">
                    {t('sessionLog.sessionTitle')}
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <TextInput
                      key={`${session.id}:${revision}`}
                      id="session-title"
                      defaultValue={session.title}
                      onChange={(event) => {
                        if (event.target.value.trim())
                          useSessionStore
                            .getState()
                            .updateSession(session.id, { title: event.target.value });
                      }}
                      onBlur={(event) => {
                        const title =
                          event.target.value.trim() || t('sessionLog.untitled');
                        event.target.value = title;
                        useSessionStore.getState().updateSession(session.id, { title });
                      }}
                    />
                    <IconButton
                      label={t('sessionLog.exportHeading')}
                      onClick={() => setExportOpen(true)}
                    >
                      <Copy size={18} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={t('sessionLog.deleteSession')}
                      variant="danger"
                      disabled={Boolean(selectedOwnsCapture)}
                      aria-describedby={
                        selectedOwnsCapture ? 'recording-delete-help' : undefined
                      }
                      onClick={async () => {
                        if (
                          !(await confirmDialog(
                            t('sessionLog.deleteNamedSession', {
                              name: session.title.trim() || t('sessionLog.untitled'),
                              count: session.entries.length,
                            }),
                            {
                              tone: 'danger',
                              confirmLabel: t('common.delete'),
                              initialFocus: 'cancel',
                            },
                          ))
                        )
                          return;
                        setDeleted({
                          session,
                          index: sessions.findIndex((item) => item.id === session.id),
                        });
                        useSessionStore.getState().deleteSession(session.id);
                      }}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </IconButton>
                  </div>
                  {selectedOwnsCapture && (
                    <p id="recording-delete-help" className="mt-2 text-sm text-ink-400">
                      {t('sessionLog.cannotDeleteRecording')}
                    </p>
                  )}
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-ink-300">
                    {t('sessionLog.metadata')}
                  </summary>
                  <div className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="field-label" htmlFor="session-campaign">
                          {t('sessionLog.campaign')}
                        </label>
                        <TextInput
                          id="session-campaign"
                          className="mt-2"
                          value={session.campaign ?? ''}
                          onChange={(event) =>
                            useSessionStore
                              .getState()
                              .updateSession(session.id, { campaign: event.target.value })
                          }
                          onBlur={(event) =>
                            useSessionStore.getState().updateSession(session.id, {
                              campaign: event.target.value.trim(),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="session-date">
                          {t('sessionLog.sessionDate')}
                        </label>
                        <TextInput
                          id="session-date"
                          className="mt-2"
                          type="date"
                          max="9999-12-31"
                          value={
                            session.sessionDate ?? sessionDateValue(session.createdAt)
                          }
                          onChange={(event) =>
                            useSessionStore.getState().updateSession(session.id, {
                              sessionDate: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="session-number">
                          {t('sessionLog.sessionNumber')}
                        </label>
                        <TextInput
                          id="session-number"
                          className="mt-2"
                          value={session.number ?? ''}
                          onChange={(event) =>
                            useSessionStore
                              .getState()
                              .updateSession(session.id, { number: event.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </details>
              </section>

              {(speech.busy || speech.speechError) && tab !== 'transcript' && (
                <div
                  role={speech.speechError ? 'alert' : 'status'}
                  className="notice flex flex-wrap items-center justify-between gap-3"
                >
                  <p>
                    {speech.speechError && <span>{speech.speechError} </span>}
                    {t('sessionLog.captureFor', {
                      name: captureOwner?.title || t('sessionLog.untitled'),
                    })}{' '}
                    {t('sessionLog.pending', { count: speech.pendingCount })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(speech.listening || speech.status === 'starting') && (
                      <Button variant="danger" onClick={speech.stop}>
                        {t('sessionLog.stop')}
                      </Button>
                    )}
                    <Button onClick={() => setTab('transcript')}>
                      {t('sessionLog.viewTranscript')}
                    </Button>
                  </div>
                </div>
              )}
              <SessionContextPanel
                key={`${session.id}:${revision}`}
                session={session}
                onManage={() => setContextsOpen(true)}
              />
              <nav
                className="flex flex-wrap gap-2"
                aria-label={t('sessionLog.sessionViews')}
              >
                {(['notes', 'transcript', 'summary'] as const).map((value) => (
                  <ToggleChip
                    key={value}
                    active={tab === value}
                    onClick={() => setTab(value)}
                    aria-controls="session-view"
                  >
                    {t(`sessionLog.${value}Tab`)}
                    {value === 'transcript' && (
                      <span className="ml-2 tabular-nums">{session.entries.length}</span>
                    )}
                  </ToggleChip>
                ))}
              </nav>
              <div id="session-view">
                {tab === 'notes' && (
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="field-label" htmlFor="session-notes">
                        {t('sessionLog.notes')}
                      </label>
                      {!session.notes.trim() && (
                        <Button
                          onClick={() =>
                            useSessionStore.getState().updateSession(session.id, {
                              notes: [
                                'templateEvents',
                                'templateCharacters',
                                'templateQuests',
                                'templateNext',
                              ]
                                .map((key) => `## ${t(`sessionLog.${key}`)}\n\n`)
                                .join('\n'),
                            })
                          }
                        >
                          {t('sessionLog.notesTemplate')}
                        </Button>
                      )}
                    </div>
                    <textarea
                      id="session-notes"
                      className={inputClass('w-full resize-y')}
                      rows={14}
                      value={session.notes}
                      onChange={(event) =>
                        useSessionStore
                          .getState()
                          .updateSession(session.id, { notes: event.target.value })
                      }
                      placeholder={t('sessionLog.notesPlaceholder')}
                    />
                  </section>
                )}
                <div hidden={tab !== 'transcript'} className="space-y-6">
                  <section
                    className={panelClass('space-y-4 p-4')}
                    aria-labelledby="transcription-heading"
                  >
                    <h2 id="transcription-heading" className="section-title">
                      {t('sessionLog.captureHeading')}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {speech.supported && (
                        <Button
                          variant={
                            speech.listening || speech.status === 'starting'
                              ? 'danger'
                              : 'primary'
                          }
                          disabled={
                            speech.status === 'processing' ||
                            (speech.busy && speech.status === 'error')
                          }
                          onClick={() => {
                            if (speech.listening || speech.status === 'starting')
                              speech.stop();
                            else {
                              setOwnerId(session.id);
                              void speech.start();
                            }
                          }}
                        >
                          {speech.listening || speech.status === 'starting' ? (
                            <Square size={16} aria-hidden="true" />
                          ) : (
                            <Mic size={16} aria-hidden="true" />
                          )}
                          {t(
                            speech.listening || speech.status === 'starting'
                              ? 'sessionLog.stop'
                              : 'sessionLog.record',
                          )}
                        </Button>
                      )}
                      <span className="font-mono text-lg tabular-nums text-ink-200">
                        {formatDuration(session.durationMs + captureExtra)}
                      </span>
                    </div>
                    {!speech.supported && (
                      <p className="notice">{t('sessionLog.voiceNotSupported')}</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="field-label" htmlFor="transcription-language">
                          {t('sessionLog.transcriptionLanguage')}
                        </label>
                        <Select
                          id="transcription-language"
                          className="mt-2"
                          value={lang}
                          disabled={speech.busy}
                          onChange={(event) =>
                            useSessionStore
                              .getState()
                              .setTranscriptionLang(event.target.value)
                          }
                        >
                          <option value="english">{t('sessionLog.english')}</option>
                          <option value="polish">{t('sessionLog.polish')}</option>
                        </Select>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="transcription-mode">
                          {t('sessionLog.mode')}
                        </label>
                        <Select
                          id="transcription-mode"
                          className="mt-2"
                          value={mode}
                          disabled={speech.busy}
                          onChange={(event) =>
                            useSessionStore
                              .getState()
                              .setTranscriptionMode(event.target.value as SpeechMode)
                          }
                        >
                          {(['auto', 'browser', 'local'] as const).map((value) => (
                            <option key={value} value={value}>
                              {t(
                                `sessionLog.mode${value[0]!.toUpperCase()}${value.slice(1)}`,
                              )}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-ink-400">
                      {t('sessionLog.modeHelp')}
                    </p>
                    <p className="text-sm leading-6 text-ink-400">
                      {t('sessionLog.noAudioArchive')}
                    </p>
                    <div role="status" className="notice space-y-1">
                      <p>
                        {t(
                          `sessionLog.capture${speech.status[0]!.toUpperCase()}${speech.status.slice(1)}`,
                        )}
                      </p>
                      {speech.busy && speech.backend && (
                        <p className="text-sm">
                          {t(
                            speech.backend === 'browser'
                              ? 'sessionLog.backendBrowser'
                              : 'sessionLog.backendLocal',
                          )}
                        </p>
                      )}
                      {speech.busy && captureOwner && (
                        <p className="text-sm">
                          {t('sessionLog.captureFor', {
                            name: captureOwner.title || t('sessionLog.untitled'),
                          })}
                        </p>
                      )}
                      {speech.pendingCount > 0 && (
                        <p className="text-sm">
                          {t('sessionLog.pending', { count: speech.pendingCount })}
                        </p>
                      )}
                      {speech.modelProgress && (
                        <p className="text-sm">{speech.modelProgress}</p>
                      )}
                    </div>
                    {speech.interim && (
                      <p className="break-words text-sm text-ink-400">{speech.interim}</p>
                    )}
                    {speech.speechError && (
                      <div role="alert" className="notice notice-error space-y-3">
                        <p>{speech.speechError}</p>
                        {speech.canRetry && (
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => void speech.retry()}>
                              {t('sessionLog.retryTranscription')}
                            </Button>
                            <Button variant="danger" onClick={() => void discard()}>
                              {t('sessionLog.discardPending')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                  <TranscriptPanel
                    key={`${session.id}:${revision}`}
                    session={session}
                    active={tab === 'transcript'}
                  />
                </div>
                {tab === 'summary' && (
                  <section className="space-y-3">
                    <label className="field-label" htmlFor="session-summary">
                      {t('sessionLog.summaryLabel')}
                    </label>
                    <textarea
                      id="session-summary"
                      className={inputClass('w-full resize-y')}
                      rows={14}
                      value={session.summary ?? ''}
                      onChange={(event) =>
                        useSessionStore
                          .getState()
                          .updateSession(session.id, { summary: event.target.value })
                      }
                      placeholder={t('sessionLog.summaryPlaceholder')}
                    />
                  </section>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
      {mobileOpen && (
        <div className="dialog-overlay z-40" onClick={() => setMobileOpen(false)}>
          <section
            ref={mobileRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={mobileTitleId}
            className="dialog-panel flex max-h-[90dvh] w-full max-w-md flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-ink-700 p-4">
              <h2 id={mobileTitleId} className="section-title">
                {t('sessionLog.sessions')}
              </h2>
              <IconButton
                label={t('common.close')}
                variant="ghost"
                size="sm"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </IconButton>
            </header>
            <div className="space-y-4 overflow-y-auto p-4">
              <Button onClick={createSession}>
                <Plus size={16} aria-hidden="true" />
                {t('sessionLog.newSession')}
              </Button>
              <SessionList {...listProps} />
            </div>
          </section>
        </div>
      )}
      <CampaignContextsDialog
        open={contextsOpen}
        onClose={() => setContextsOpen(false)}
      />
      {exportOpen && session && (
        <SessionExportDialog session={session} onClose={() => setExportOpen(false)} />
      )}
      <RecordingNavigationGuard speech={speech} />
    </div>
  );
}
