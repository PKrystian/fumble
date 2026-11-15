import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import { serializeSoundboard, SOUNDBOARD_KEY } from './persistence';
import { readSoundboardData, type SoundboardData } from './validation';

export function downloadSoundboardFile(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

export function soundboardBackup(data: SoundboardData) {
  return {
    app: 'fumble-soundboard',
    version: 1,
    exportedAt: new Date().toISOString(),
    soundboard: JSON.parse(serializeSoundboard(data)) as {
      version: number;
      state: SoundboardData;
    },
  };
}

export function downloadSoundboard(data: SoundboardData) {
  downloadSoundboardFile(
    JSON.stringify(soundboardBackup(data), null, 2),
    'fumble-soundboard.json',
  );
}

export function parseSoundboardFile(text: string): {
  data: SoundboardData;
  exportedAt: string;
  version: number;
} {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('backup-too-large');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object') throw new Error('backup-invalid');
  const backup = value as Record<string, unknown>;
  let snapshot: unknown;
  if (backup.app === 'fumble') {
    const full = parseBackup(text);
    snapshot = JSON.parse(full.data[SOUNDBOARD_KEY] ?? 'null');
  } else {
    if (backup.app !== 'fumble-soundboard' || backup.version !== 1)
      throw new Error('backup-invalid');
    snapshot = backup.soundboard;
  }
  if (
    typeof backup.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(backup.exportedAt)) ||
    new Date(backup.exportedAt).toISOString() !== backup.exportedAt ||
    !snapshot ||
    typeof snapshot !== 'object'
  )
    throw new Error('backup-invalid');
  const stored = snapshot as Record<string, unknown>;
  if (typeof stored.version !== 'number') throw new Error('backup-invalid');
  return {
    data: readSoundboardData(stored.state, stored.version),
    exportedAt: backup.exportedAt,
    version: backup.version as number,
  };
}
