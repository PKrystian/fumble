import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import { isRecord, validateBackupEntry } from '@/features/data/backupValidation';
import { SESSIONS_KEY } from './persistence';
import { serializeSessions } from './store';

const FORMAT = 'fumble-sessions';

export function sessionsBackupText(): string {
  const text = JSON.stringify(
    {
      app: FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: JSON.parse(serializeSessions()) as unknown,
    },
    null,
    2,
  );
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('sessions-backup-too-large');
  return text;
}

export function parseSessionsFile(text: string) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('sessions-backup-too-large');
  const file: unknown = JSON.parse(text);
  if (
    !isRecord(file) ||
    file.version !== 1 ||
    typeof file.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(file.exportedAt)) ||
    new Date(file.exportedAt).toISOString() !== file.exportedAt
  )
    throw new Error('sessions-backup-invalid');
  const stored: unknown =
    file.app === 'fumble'
      ? JSON.parse(parseBackup(text).data[SESSIONS_KEY] ?? 'null')
      : file.app === FORMAT
        ? file.sessions
        : null;
  if (!isRecord(stored) || !isRecord(stored.state))
    throw new Error('sessions-backup-invalid');
  validateBackupEntry(SESSIONS_KEY, stored);
  const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  return {
    raw: JSON.stringify(stored),
    sessions: count(stored.state.sessions),
    contexts: count(stored.state.contexts),
    exportedAt: file.exportedAt,
    version: file.version,
  };
}
