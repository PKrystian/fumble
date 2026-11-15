import { BACKUP_REMINDER_KEY } from './backupReminder';
import { isRecord, validateBackupEntry } from './backupValidation';
import { ENCOUNTER_KEY, isEncounterBackup } from '@/features/dm/encounterModel';
import { INITIATIVE_KEY } from '@/features/initiative/model';
import { BOOK_READING_KEY, parseBookReading } from '@/features/books/readingData';

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_KEYS = 100;

export interface FumbleBackup {
  app: 'fumble';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: Record<string, string>;
}

export function createBackup(storage: Storage): FumbleBackup {
  const data: Record<string, string> = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith('fumble-')) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return {
    app: 'fumble',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function serializeBackup(backup: FumbleBackup): string {
  if (Object.keys(backup.data).length > MAX_BACKUP_KEYS)
    throw new Error('backup-too-many-keys');
  const text = JSON.stringify(backup, null, 2);
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');
  return text;
}

export function parseBackup(text: string): FumbleBackup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');

  const value = JSON.parse(text) as unknown;
  if (!isRecord(value)) throw new Error('backup-invalid');
  const backup = value as Partial<FumbleBackup>;
  if (
    backup.app !== 'fumble' ||
    typeof backup.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(backup.exportedAt)) ||
    new Date(backup.exportedAt).toISOString() !== backup.exportedAt ||
    !isRecord(backup.data)
  ) {
    throw new Error('backup-invalid');
  }
  if (backup.version !== BACKUP_VERSION) throw new Error('backup-version');
  const keys = Object.keys(backup.data);
  if (keys.length > MAX_BACKUP_KEYS) throw new Error('backup-too-many-keys');
  for (const [key, item] of Object.entries(backup.data)) {
    if (!key.startsWith('fumble-') || typeof item !== 'string') {
      throw new Error('backup-invalid');
    }
    validateBackupEntry(key, JSON.parse(item));
  }
  return backup as FumbleBackup;
}

export const SUMMARY_GROUPS = [
  'characters',
  'sessions',
  'homebrew',
  'contexts',
  'combatants',
  'tracks',
  'customRolls',
  'rolls',
  'loot',
  'encounters',
  'encounterDraft',
  'reading',
  'maps',
  'settings',
  'other',
] as const;
export type BackupSummary = Record<(typeof SUMMARY_GROUPS)[number], number>;

export function summarizeBackup(backup: FumbleBackup): BackupSummary {
  const summary: BackupSummary = {
    characters: 0,
    sessions: 0,
    contexts: 0,
    homebrew: 0,
    combatants: 0,
    tracks: 0,
    customRolls: 0,
    rolls: 0,
    loot: 0,
    encounters: 0,
    encounterDraft: 0,
    reading: 0,
    maps: 0,
    settings: 0,
    other: 0,
  };
  const collections: Record<string, keyof BackupSummary> = {
    'fumble-characters': 'characters',
    'fumble-sessions': 'sessions',
    'fumble-homebrew': 'homebrew',
    [INITIATIVE_KEY]: 'combatants',
    'fumble-soundboard': 'tracks',
    'fumble-custom-rolls': 'customRolls',
    'fumble-roll-history': 'rolls',
    'fumble-loot': 'loot',
  };
  for (const [key, raw] of Object.entries(backup.data)) {
    const group = collections[key];
    if (key === ENCOUNTER_KEY) {
      const value: unknown = JSON.parse(raw);
      if (!isEncounterBackup(value)) throw new Error('backup-invalid-data');
      summary.encounters = value.state.library.length;
      summary.encounterDraft = 1;
    } else if (key === BOOK_READING_KEY) {
      const reading = parseBookReading(raw);
      if (!reading) throw new Error('backup-invalid-data');
      summary.reading = Object.keys(reading.positions).length;
      summary.settings += 1;
    } else if (group) {
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value) || !isRecord(value.state))
        throw new Error('backup-invalid-data');
      const field =
        group === 'homebrew'
          ? 'entries'
          : group === 'rolls'
            ? 'log'
            : group === 'loot'
              ? 'history'
              : group;
      const items = value.state[field] ?? {};
      summary[group] = Object.keys(items).length;
      if (group === 'sessions')
        summary.contexts = Object.keys(value.state.contexts ?? {}).length;
    } else if (key.startsWith('fumble-campaign-map-editor:')) {
      summary.maps += 1;
    } else if (
      [
        'fumble-locale',
        'fumble-sidebar',
        'fumble-content-mode',
        'fumble-sheet-layout',
        'fumble-homebrew-visibility',
        BACKUP_REMINDER_KEY,
      ].includes(key)
    ) {
      summary.settings += 1;
    } else {
      summary.other += 1;
    }
  }
  return summary;
}

export function restoreBackup(storage: Storage, backup: FumbleBackup): void {
  const previous = createBackup(storage);
  const currentKeys = Object.keys(previous.data);
  try {
    for (const key of currentKeys) storage.removeItem(key);
    for (const [key, value] of Object.entries(backup.data)) {
      storage.setItem(key, value);
    }
  } catch (error) {
    for (const key of Object.keys(backup.data)) storage.removeItem(key);
    for (const [key, value] of Object.entries(previous.data)) {
      storage.setItem(key, value);
    }
    throw error;
  }
}

export const STORAGE_CHARACTER_LIMIT = 5_000_000;

export function storageUsage(storage: Storage): number {
  let characters = 0;
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)!;
    characters += key.length + storage.getItem(key)!.length;
  }
  return characters / STORAGE_CHARACTER_LIMIT;
}

export function backupFilename(date = new Date()): string {
  return `fumble-backup-${date.toISOString().slice(0, 10)}.json`;
}
