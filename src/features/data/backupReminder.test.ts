import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_REMINDER_KEY,
  backupReminderStatus,
  readBackupReminder,
  recordFullBackup,
  snoozeBackupReminder,
} from './backupReminder';

const DAY = 86_400_000;

describe('backup reminder', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty and ignores malformed stored values', () => {
    expect(readBackupReminder()).toEqual({ lastBackupAt: null, snoozedUntil: null });
    localStorage.setItem(BACKUP_REMINDER_KEY, '{broken');
    expect(readBackupReminder()).toEqual({ lastBackupAt: null, snoozedUntil: null });
    localStorage.setItem(
      BACKUP_REMINDER_KEY,
      JSON.stringify({ state: { lastBackupAt: -1, snoozedUntil: 'soon' } }),
    );
    expect(readBackupReminder()).toEqual({ lastBackupAt: null, snoozedUntil: null });
    localStorage.setItem(BACKUP_REMINDER_KEY, '{}');
    expect(readBackupReminder()).toEqual({ lastBackupAt: null, snoozedUntil: null });
  });

  it('records a full backup and clears a postponement', () => {
    expect(snoozeBackupReminder(1000)).toEqual({
      lastBackupAt: null,
      snoozedUntil: 1000 + 30 * DAY,
    });
    expect(recordFullBackup(5000)).toEqual({ lastBackupAt: 5000, snoozedUntil: null });
    expect(JSON.parse(localStorage.getItem(BACKUP_REMINDER_KEY)!)).toEqual({
      version: 1,
      state: { lastBackupAt: 5000, snoozedUntil: null },
    });
    expect(snoozeBackupReminder(6000)).toEqual({
      lastBackupAt: 5000,
      snoozedUntil: 6000 + 30 * DAY,
    });
    expect(recordFullBackup().lastBackupAt).toBeGreaterThan(6000);
    expect(snoozeBackupReminder().snoozedUntil).toBeGreaterThan(30 * DAY);
  });

  it('keeps working in memory when the browser refuses the write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(recordFullBackup(7000)).toEqual({ lastBackupAt: 7000, snoozedUntil: null });
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toBeNull();
    setItem.mockRestore();
  });

  it('is due without a backup, after thirty days, and not while postponed', () => {
    const now = 100 * DAY;
    expect(backupReminderStatus({ lastBackupAt: null, snoozedUntil: null }, now)).toEqual(
      { due: true, days: null },
    );
    expect(
      backupReminderStatus({ lastBackupAt: now - 29 * DAY, snoozedUntil: null }, now),
    ).toEqual({ due: false });
    expect(
      backupReminderStatus({ lastBackupAt: now - 45.5 * DAY, snoozedUntil: null }, now),
    ).toEqual({ due: true, days: 45 });
    expect(
      backupReminderStatus({ lastBackupAt: null, snoozedUntil: now + 1 }, now),
    ).toEqual({ due: false });
    expect(backupReminderStatus({ lastBackupAt: null, snoozedUntil: now }, now)).toEqual({
      due: true,
      days: null,
    });
    expect(
      backupReminderStatus({ lastBackupAt: now + DAY, snoozedUntil: null }, now),
    ).toEqual({ due: false });
  });

  it('waits for month-old data when no backup date is known', () => {
    const now = 100 * DAY;
    const never = { lastBackupAt: null, snoozedUntil: null };
    expect(backupReminderStatus(never, now, now - 5 * DAY)).toEqual({ due: false });
    expect(backupReminderStatus(never, now, now - 30 * DAY)).toEqual({
      due: true,
      days: null,
    });
    expect(
      backupReminderStatus(
        { lastBackupAt: now - 31 * DAY, snoozedUntil: null },
        now,
        now,
      ),
    ).toEqual({ due: true, days: 31 });
  });
});
