export const BACKUP_REMINDER_KEY = 'fumble-backup-reminder';
export const BACKUP_REMINDER_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 30;

const DAY_MS = 86_400_000;

export interface BackupReminderState {
  lastBackupAt: number | null;
  snoozedUntil: number | null;
}

export type BackupReminderStatus = { due: false } | { due: true; days: number | null };

function timestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function readBackupReminder(): BackupReminderState {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(BACKUP_REMINDER_KEY) ?? 'null',
    ) as { state?: Partial<BackupReminderState> } | null;
    return {
      lastBackupAt: timestamp(value?.state?.lastBackupAt),
      snoozedUntil: timestamp(value?.state?.snoozedUntil),
    };
  } catch {
    return { lastBackupAt: null, snoozedUntil: null };
  }
}

function writeBackupReminder(state: BackupReminderState): BackupReminderState {
  try {
    window.localStorage.setItem(
      BACKUP_REMINDER_KEY,
      JSON.stringify({ version: BACKUP_REMINDER_VERSION, state }),
    );
  } catch {
    return state;
  }
  return state;
}

export function recordFullBackup(now = Date.now()): BackupReminderState {
  return writeBackupReminder({ lastBackupAt: now, snoozedUntil: null });
}

export function snoozeBackupReminder(now = Date.now()): BackupReminderState {
  return writeBackupReminder({
    ...readBackupReminder(),
    snoozedUntil: now + BACKUP_REMINDER_DAYS * DAY_MS,
  });
}

export function backupReminderStatus(
  { lastBackupAt, snoozedUntil }: BackupReminderState,
  now: number,
  dataSince: number | null = null,
): BackupReminderStatus {
  if (snoozedUntil !== null && now < snoozedUntil) return { due: false };
  const days = Math.floor((now - (lastBackupAt ?? dataSince ?? 0)) / DAY_MS);
  if (days < BACKUP_REMINDER_DAYS) return { due: false };
  return { due: true, days: lastBackupAt === null ? null : days };
}
