import { createBackup, serializeBackup } from '@/features/data/backup';
import { SESSIONS_KEY } from './persistence';
import { serializeSessions } from './store';

export function createJournalBackup(storage: Storage): string {
  const backup = createBackup(storage);
  backup.data[SESSIONS_KEY] = serializeSessions();
  return serializeBackup(backup);
}
