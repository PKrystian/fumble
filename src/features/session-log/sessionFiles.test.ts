import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackup, MAX_BACKUP_BYTES, serializeBackup } from '@/features/data/backup';
import { parseSessionsFile, sessionsBackupText } from './sessionFiles';
import { useSessionStore } from './store';

beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await useSessionStore.persist.rehydrate();
  useSessionStore.setState({ sessions: [], contexts: [], selectedSessionId: null });
});

describe('session journal backup files', () => {
  it('round trips the journal through its own file and a full backup', () => {
    useSessionStore.getState().addSession('Kept');
    useSessionStore.getState().addContext('World');
    const scoped = parseSessionsFile(sessionsBackupText());
    expect(scoped).toMatchObject({ sessions: 1, contexts: 1, version: 1 });
    expect(JSON.parse(scoped.raw).state.sessions[0].title).toBe('Kept');

    const full = parseSessionsFile(serializeBackup(createBackup(localStorage)));
    expect(full.sessions).toBe(1);
  });

  it('counts legacy snapshots without contexts', () => {
    const legacy = JSON.stringify({
      app: 'fumble-sessions',
      version: 1,
      exportedAt: '2026-08-03T12:00:00.000Z',
      sessions: { state: {}, version: 2 },
    });
    expect(parseSessionsFile(legacy)).toMatchObject({ sessions: 0, contexts: 0 });
  });

  it('rejects other files, bad dates, missing journals and oversized content', () => {
    const base = {
      app: 'fumble-sessions',
      version: 1,
      exportedAt: '2026-08-03T12:00:00.000Z',
      sessions: { state: { sessions: [] }, version: 4 },
    };
    for (const value of [
      null,
      { ...base, version: 2 },
      { ...base, exportedAt: 3 },
      { ...base, exportedAt: 'yesterday' },
      { ...base, exportedAt: '2026-08-03' },
      { ...base, app: 'fumble-loot' },
      { ...base, sessions: null },
      { ...base, sessions: { state: null, version: 4 } },
      { ...base, sessions: { state: { sessions: 'none' }, version: 4 } },
      { ...base, sessions: { state: {}, version: 99 } },
    ])
      expect(() => parseSessionsFile(JSON.stringify(value))).toThrow();
    const withoutJournal = serializeBackup(createBackup(localStorage)).replace(
      /"fumble-sessions"/,
      '"fumble-absent"',
    );
    expect(() => parseSessionsFile(withoutJournal)).toThrow();
    expect(() => parseSessionsFile('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow(
      'sessions-backup-too-large',
    );
    useSessionStore.setState({
      sessions: [
        {
          id: 'big',
          title: 'Big',
          createdAt: 1,
          durationMs: 0,
          notes: 'x'.repeat(MAX_BACKUP_BYTES),
          entries: [],
        },
      ],
    });
    expect(() => sessionsBackupText()).toThrow('sessions-backup-too-large');
  });
});
