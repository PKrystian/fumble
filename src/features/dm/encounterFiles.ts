import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import {
  ENCOUNTER_KEY,
  ENCOUNTER_VERSION,
  isEncounterBackup,
  type EncounterData,
} from './encounterModel';

export function encounterBackupText(data: EncounterData) {
  const text = JSON.stringify(
    {
      app: 'fumble-encounter',
      version: 1,
      exportedAt: new Date().toISOString(),
      encounter: { state: data, version: ENCOUNTER_VERSION },
    },
    null,
    2,
  );
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('encounter-backup-too-large');
  return text;
}

export function parseEncounterFile(text: string) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error('encounter-backup-too-large');
  const file = JSON.parse(text) as Record<string, unknown> | null;
  if (
    !file ||
    typeof file.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(file.exportedAt)) ||
    new Date(file.exportedAt).toISOString() !== file.exportedAt ||
    file.version !== 1
  )
    throw new Error('encounter-backup-invalid');
  const stored: unknown =
    file.app === 'fumble'
      ? JSON.parse(parseBackup(text).data[ENCOUNTER_KEY] ?? 'null')
      : file.app === 'fumble-encounter'
        ? file.encounter
        : null;
  if (!isEncounterBackup(stored)) throw new Error('encounter-backup-invalid');
  return { data: stored.state, exportedAt: file.exportedAt, version: file.version };
}
