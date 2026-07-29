export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

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

export function parseBackup(text: string): FumbleBackup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');

  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== 'object') throw new Error('backup-invalid');
  const backup = value as Partial<FumbleBackup>;
  if (
    backup.app !== 'fumble' ||
    backup.version !== BACKUP_VERSION ||
    !backup.data ||
    typeof backup.data !== 'object' ||
    Array.isArray(backup.data)
  ) {
    throw new Error('backup-invalid');
  }
  for (const [key, item] of Object.entries(backup.data)) {
    if (!key.startsWith('fumble-') || typeof item !== 'string') {
      throw new Error('backup-invalid');
    }
    JSON.parse(item);
  }
  return backup as FumbleBackup;
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

export function backupFilename(date = new Date()): string {
  return `fumble-backup-${date.toISOString().slice(0, 10)}.json`;
}
