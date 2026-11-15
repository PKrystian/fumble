import { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useSoundboardStore } from '@/features/soundboard/store';
import { useLootStore, serializeLoot } from '@/features/dm/lootStore';
import { LOOT_KEY } from '@/features/dm/lootData';
import { ENCOUNTER_KEY, parseStoredEncounter } from '@/features/dm/encounterModel';
import { serializeEncounter, useEncounterStore } from '@/features/dm/encounterStore';
import {
  INITIATIVE_KEY,
  parseStoredInitiative,
  serializeInitiative,
} from '@/features/initiative/model';
import { useInitiativeStore } from '@/features/initiative/store';
import { useCharacterStore } from '@/features/character/store';
import {
  CHARACTERS_KEY,
  parseStoredCharacters,
  serializeCharacters,
} from '@/features/character/characterData';
import { Link } from '@/i18n/path';
import {
  HOMEBREW_KEY,
  parseStoredHomebrew,
  serializeHomebrew,
  useHomebrewStore,
  withHomebrewWrite,
} from '@/features/homebrew/store';
import {
  BOOK_READING_KEY,
  emptyBookReading,
  parseBookReading,
  serializeBookReading,
} from '@/features/books/readingData';
import { useBookReading } from '@/features/books/readingStore';
import {
  getSoundboardSaveStatus,
  serializeSoundboard,
  SOUNDBOARD_KEY,
} from '@/features/soundboard/persistence';
import {
  MAX_BACKUP_BYTES,
  SUMMARY_GROUPS,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
  storageUsage,
  summarizeBackup,
  type BackupSummary,
  type FumbleBackup,
} from './backup';
import { readBackupReminder, recordFullBackup } from './backupReminder';
import { ToolBackups } from './ToolBackups';
import {
  SESSIONS_KEY,
  useSessionSaveStatus,
  getSessionSaveStatus,
} from '@/features/session-log/persistence';
import { serializeSessions } from '@/features/session-log/store';

type Status =
  | 'idle'
  | 'exported'
  | 'invalid'
  | 'invalidData'
  | 'unsupportedVersion'
  | 'tooLarge'
  | 'tooManyKeys'
  | 'readError'
  | 'exportError'
  | 'storageError';
type Selection = { backup: FumbleBackup; summary: BackupSummary; filename: string };

function currentBackup() {
  const stored = createBackup(localStorage);
  let backup = { ...stored, data: { ...stored.data } };
  const homebrew = useHomebrewStore.getState();
  if (homebrew.dirty) backup.data[HOMEBREW_KEY] = serializeHomebrew(homebrew.entries);
  else if (!parseStoredHomebrew(backup.data[HOMEBREW_KEY] ?? null))
    delete backup.data[HOMEBREW_KEY];
  const reading = useBookReading.getState();
  const readingRaw = backup.data[BOOK_READING_KEY];
  if (reading.status !== 'ready' && reading.data !== emptyBookReading) {
    backup.data[BOOK_READING_KEY] = serializeBookReading(reading.data);
  } else if (readingRaw !== undefined && !parseBookReading(readingRaw)) {
    delete backup.data[BOOK_READING_KEY];
  }
  const characters = useCharacterStore.getState();
  const charactersRaw = backup.data[CHARACTERS_KEY];
  if (characters.dirty) backup.data[CHARACTERS_KEY] = serializeCharacters(characters);
  else if (charactersRaw !== undefined && !parseStoredCharacters(charactersRaw))
    delete backup.data[CHARACTERS_KEY];
  const initiative = useInitiativeStore.getState();
  const initiativeRaw = backup.data[INITIATIVE_KEY];
  if (initiative.dirty) backup.data[INITIATIVE_KEY] = serializeInitiative(initiative);
  else if (initiativeRaw !== undefined && !parseStoredInitiative(initiativeRaw))
    delete backup.data[INITIATIVE_KEY];
  const encounter = useEncounterStore.getState();
  const encounterRaw = backup.data[ENCOUNTER_KEY];
  if (
    encounter.blocked &&
    encounterRaw !== undefined &&
    !parseStoredEncounter(encounterRaw)
  )
    delete backup.data[ENCOUNTER_KEY];
  if (!encounter.blocked && !encounter.saved)
    backup.data[ENCOUNTER_KEY] = serializeEncounter(encounter.data);
  const sessions = getSessionSaveStatus().state;
  if (sessions === 'unreadable') delete backup.data[SESSIONS_KEY];
  else if (sessions !== 'saved') backup.data[SESSIONS_KEY] = serializeSessions();
  const loot = useLootStore.getState();
  if (!loot.saved && !loot.blocked)
    backup = {
      ...backup,
      data: { ...backup.data, [LOOT_KEY]: serializeLoot(loot.data) },
    };
  const status = getSoundboardSaveStatus();
  if (!status.saved && !status.blocked)
    return {
      ...backup,
      data: {
        ...backup.data,
        [SOUNDBOARD_KEY]: serializeSoundboard(useSoundboardStore.getState()),
      },
    };
  return backup;
}

function readCurrent() {
  try {
    const backup = currentBackup();
    return {
      summary: summarizeBackup(backup),
      keys: Object.keys(backup.data).length,
      usage: storageUsage(localStorage),
      lastBackupAt: readBackupReminder().lastBackupAt,
    };
  } catch {
    return null;
  }
}

function downloadCurrent() {
  const blob = new Blob([serializeBackup(currentBackup())], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupFilename();
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

function importError(error: unknown): Status {
  if (error instanceof SyntaxError) return 'invalid';
  if (error instanceof Error) {
    const statuses: Record<string, Status> = {
      'backup-invalid': 'invalid',
      'backup-invalid-data': 'invalidData',
      'backup-version': 'unsupportedVersion',
      'backup-too-large': 'tooLarge',
      'backup-too-many-keys': 'tooManyKeys',
    };
    return statuses[error.message] ?? 'readError';
  }
  return 'readError';
}

function BackupContents({ summary }: { summary: BackupSummary }) {
  const { t } = useT();
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {SUMMARY_GROUPS.filter((group, index) => index < 3 || summary[group] > 0).map(
        (group) => (
          <div key={group} className="min-w-0">
            <dt className="text-ink-400">{t(`data.counts.${group}`)}</dt>
            <dd className="font-semibold text-ink-50 tabular-nums">{summary[group]}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

export function DataManagementPage() {
  const { locale, t } = useT();
  const encounterBlocked = useEncounterStore((state) => state.blocked);
  const initiativeStatus = useInitiativeStore((state) => state.status);
  const homebrewStatus = useHomebrewStore((state) => state.status);
  const sessionState = useSessionSaveStatus().state;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLHeadingElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const operation = useRef(0);
  const [current, setCurrent] = useState(readCurrent);
  const [status, setStatus] = useState<Status>('idle');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [emptyAccepted, setEmptyAccepted] = useState(false);
  useSeo(t('seo.pageTitles.data'), t('seo.pageDescriptions.data'), false);

  useEffect(() => {
    useInitiativeStore.getState().checkStorage();
    useHomebrewStore.getState().checkStorage();
    useCharacterStore.getState().checkStorage();
  }, []);

  useEffect(
    () => () => {
      operation.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (selection) previewRef.current?.focus();
  }, [selection]);

  const exportData = () => {
    try {
      downloadCurrent();
      recordFullBackup();
      setCurrent(readCurrent());
      setStatus('exported');
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === 'backup-too-large'
          ? 'tooLarge'
          : error instanceof Error && error.message === 'backup-too-many-keys'
            ? 'tooManyKeys'
            : 'exportError',
      );
    }
  };

  const selectFile = async (file: File) => {
    const token = ++operation.current;
    setStatus('idle');
    setSelection(null);
    setEmptyAccepted(false);
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');
      const text = await file.text();
      if (token !== operation.current) return;
      const backup = parseBackup(text);
      setSelection({ backup, summary: summarizeBackup(backup), filename: file.name });
    } catch (error) {
      if (token === operation.current) setStatus(importError(error));
    } finally {
      if (token === operation.current) setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restoreData = async (selected: Selection) => {
    const token = ++operation.current;
    setStatus('idle');
    setBusy(true);
    const empty = Object.keys(selected.backup.data).length === 0;
    try {
      const homebrewBefore = localStorage.getItem(HOMEBREW_KEY);
      const accepted = await confirmDialog(
        t(empty ? 'data.emptyConfirm' : 'data.importConfirm', {
          filename: selected.filename,
        }),
        {
          title: t('data.confirmTitle'),
          confirmLabel: t('data.importAction'),
          tone: 'danger',
          initialFocus: 'cancel',
        },
      );
      if (token !== operation.current) return;
      if (!accepted) {
        setBusy(false);
        return;
      }
      await withHomebrewWrite(() => {
        if (localStorage.getItem(HOMEBREW_KEY) !== homebrewBefore)
          throw new Error('homebrew-conflict');
        restoreBackup(localStorage, selected.backup);
      });
      window.location.reload();
    } catch {
      setStatus('storageError');
      setBusy(false);
    }
  };

  const empty = selection && Object.keys(selection.backup.data).length === 0;

  return (
    <div className="page-shell page-shell-reading">
      <h1 className="page-title">{t('data.title')}</h1>
      <p className="page-description">{t('data.description')}</p>
      <p className="mt-3 text-sm leading-6 text-ink-400">{t('data.localOnly')}</p>
      {encounterBlocked && (
        <p role="status" className="notice mt-3">
          {t('data.encounterRecovery')}
        </p>
      )}
      {(homebrewStatus === 'unreadable' || homebrewStatus === 'conflict') && (
        <p role="status" className="notice mt-3">
          {t('homebrew.backupRecovery')}{' '}
          <Link to="/homebrew" className="back-link">
            {t('nav.homebrew')}
          </Link>
        </p>
      )}
      {(sessionState === 'unreadable' || sessionState === 'conflict') && (
        <p role="status" className="notice mt-3">
          {t('data.sessionsRecovery')}{' '}
          <Link to="/session-log" className="back-link">
            {t('nav.sessionLog')}
          </Link>
        </p>
      )}
      {initiativeStatus === 'unreadable' && (
        <p role="status" className="notice mt-3">
          {t('initiative.fullBackupRecovery')}{' '}
          <Link to="/dm/initiative" className="back-link">
            {t('initiative.title')}
          </Link>
        </p>
      )}

      <section className={panelClass('mt-8 p-5')} aria-labelledby="current-data-title">
        <h2 id="current-data-title" className="section-title">
          {t('data.currentTitle')}
        </h2>
        {current ? (
          <>
            <BackupContents summary={current.summary} />
            {current.keys === 0 && (
              <p className="mt-4 text-sm text-ink-300">{t('data.currentEmpty')}</p>
            )}
            <dl className="mt-4 grid gap-x-4 gap-y-3 border-t border-ink-800 pt-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-ink-400">{t('data.lastBackup')}</dt>
                <dd className="font-semibold text-ink-50">
                  {current.lastBackupAt === null
                    ? t('data.lastBackupNever')
                    : new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(current.lastBackupAt))}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-ink-400">{t('data.usage')}</dt>
                <dd className="font-semibold text-ink-50 tabular-nums">
                  {current.usage < 0.01
                    ? t('data.usageLow')
                    : t('data.usageValue', {
                        percent: Math.min(100, Math.round(current.usage * 100)),
                      })}
                </dd>
                <dd className="text-ink-400">{t('data.usageHelp')}</dd>
              </div>
            </dl>
            {current.usage >= 0.8 && (
              <p className="notice notice-warning mt-4">{t('data.usageWarning')}</p>
            )}
          </>
        ) : (
          <p role="alert" className="notice notice-error mt-4">
            {t('data.currentError')}
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className={panelClass('p-5')}>
          <Download size={24} className="text-arcane-300" aria-hidden="true" />
          <h2 className="mt-3 section-title">{t('data.exportTitle')}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{t('data.exportBody')}</p>
          <Button onClick={exportData} disabled={busy} variant="primary" className="mt-5">
            {t('data.exportAction')}
          </Button>
        </section>
        <section className={panelClass('p-5')}>
          <Upload size={24} className="text-arcane-300" aria-hidden="true" />
          <h2 className="mt-3 section-title">{t('data.importTitle')}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{t('data.importBody')}</p>
          <p id="backup-file-help" className="mt-2 text-sm text-ink-400">
            {t('data.fileHelp')}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label={t('data.chooseFile')}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void selectFile(file);
            }}
          />
          <Button
            ref={chooseRef}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-describedby="backup-file-help"
            className="mt-5"
          >
            {t('data.chooseFile')}
          </Button>
        </section>
      </div>

      {!selection && <ToolBackups onChange={() => setCurrent(readCurrent())} />}
      {selection && (
        <section
          className={panelClass('mt-6 p-5')}
          aria-labelledby="backup-preview-title"
          aria-busy={busy}
        >
          <h2
            ref={previewRef}
            tabIndex={-1}
            id="backup-preview-title"
            className="section-title"
          >
            {t('data.previewTitle')}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-ink-400">{t('data.filename')}</dt>
              <dd className="break-words text-ink-50 [overflow-wrap:anywhere]">
                {selection.filename}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">{t('data.exportedAt')}</dt>
              <dd className="text-ink-50">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(selection.backup.exportedAt))}
              </dd>
            </div>
            <div>
              <dt className="text-ink-400">{t('data.fileVersion')}</dt>
              <dd className="text-ink-50">{selection.backup.version}</dd>
            </div>
          </dl>
          <BackupContents summary={selection.summary} />
          <p className="notice notice-warning mt-5">
            {t(empty ? 'data.emptyWarning' : 'data.replaceWarning')}
          </p>
          <p className="mt-4 text-sm leading-6 text-ink-300">{t('data.safetyBody')}</p>
          <Button onClick={exportData} disabled={busy} className="mt-3">
            {t('data.safetyAction')}
          </Button>
          {empty && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 py-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={emptyAccepted}
                disabled={busy}
                onChange={(event) => setEmptyAccepted(event.target.checked)}
                className="mt-1 accent-arcane-500"
              />
              <span>{t('data.emptyAccept')}</span>
            </label>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={busy || Boolean(empty && !emptyAccepted)}
              onClick={() => void restoreData(selection)}
            >
              {t('data.importAction')}
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setSelection(null);
                setStatus('idle');
                chooseRef.current?.focus();
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </section>
      )}
      <div className="mt-5 min-h-6" aria-live="polite" aria-atomic="true">
        {busy && <p className="notice">{t('data.processing')}</p>}
        {status === 'exported' && (
          <p className="notice notice-success">{t('data.exported')}</p>
        )}
        {status !== 'idle' && status !== 'exported' && (
          <p role="alert" className="notice notice-error">
            {t(`data.${status}`)}
          </p>
        )}
      </div>
    </div>
  );
}
