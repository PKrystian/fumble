import { downloadTextFile } from '@/features/storage/downloadFile';
import { backupFilename, createBackup, serializeBackup } from './backup';

export function downloadStoredBackup(): boolean {
  try {
    downloadTextFile(
      serializeBackup(createBackup(window.localStorage)),
      backupFilename(),
    );
    return true;
  } catch {
    return false;
  }
}
