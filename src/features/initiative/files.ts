import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import {
  INITIATIVE_KEY,
  readInitiative,
  initiativeSnapshot,
  type InitiativeData,
} from './model';

export function initiativeBackupText(data: InitiativeData) {
  const text = JSON.stringify(
    {
      app: INITIATIVE_KEY,
      version: 1,
      exportedAt: new Date().toISOString(),
      initiative: initiativeSnapshot(data),
    },
    null,
    2,
  );
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('initiative-backup-too-large');
  return text;
}

export function parseInitiativeFile(text: string) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('initiative-backup-too-large');
  const file = JSON.parse(text) as Record<string, unknown> | null;
  if (
    file?.version !== 1 ||
    typeof file.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(file.exportedAt)) ||
    new Date(file.exportedAt).toISOString() !== file.exportedAt
  )
    throw new Error('initiative-backup-invalid');
  const stored: unknown =
    file.app === 'fumble'
      ? JSON.parse(parseBackup(text).data[INITIATIVE_KEY] ?? 'null')
      : file.app === INITIATIVE_KEY
        ? file.initiative
        : null;
  const data = readInitiative(stored);
  if (!data) throw new Error('initiative-backup-invalid');
  return { data, exportedAt: file.exportedAt, version: file.version };
}
