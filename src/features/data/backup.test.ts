import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  MAX_BACKUP_KEYS,
  STORAGE_CHARACTER_LIMIT,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
  storageUsage,
  summarizeBackup,
} from './backup';
import type { FumbleBackup } from './backup';

describe('data backup', () => {
  beforeEach(() => localStorage.clear());

  it('exports only Fumble data', () => {
    localStorage.setItem('fumble-characters', '{"state":{}}');
    localStorage.setItem('other-app', '{"secret":true}');

    const backup = createBackup(localStorage);

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.data).toEqual({ 'fumble-characters': '{"state":{}}' });
  });

  it('validates and restores a backup', () => {
    localStorage.setItem('fumble-old', '{"state":1}');
    const backup = parseBackup(
      JSON.stringify({
        app: 'fumble',
        version: BACKUP_VERSION,
        exportedAt: '2026-07-29T00:00:00.000Z',
        data: { 'fumble-new': '{"state":2}' },
      }),
    );

    restoreBackup(localStorage, backup);

    expect(localStorage.getItem('fumble-old')).toBeNull();
    expect(localStorage.getItem('fumble-new')).toBe('{"state":2}');
  });

  it('serializes valid backups and enforces the key limit', () => {
    const backup: FumbleBackup = {
      app: 'fumble',
      version: BACKUP_VERSION,
      exportedAt: '2026-07-29T00:00:00.000Z',
      data: { 'fumble-state': '{"value":1}' },
    };
    expect(JSON.parse(serializeBackup(backup))).toEqual(backup);

    const data = Object.fromEntries(
      Array.from({ length: MAX_BACKUP_KEYS + 1 }, (_, index) => [
        `fumble-${index}`,
        '{}',
      ]),
    );
    expect(() =>
      parseBackup(
        JSON.stringify({
          app: 'fumble',
          version: BACKUP_VERSION,
          exportedAt: '2026-07-29T00:00:00.000Z',
          data,
        }),
      ),
    ).toThrow('backup-too-many-keys');

    expect(() =>
      serializeBackup({
        ...backup,
        data: { 'fumble-state': 'x'.repeat(MAX_BACKUP_BYTES) },
      }),
    ).toThrow('backup-too-large');
  });

  it('rejects unrelated or malformed data', () => {
    expect(() => parseBackup('{"app":"other","version":1,"data":{}}')).toThrow(
      'backup-invalid',
    );
    expect(() =>
      parseBackup(
        '{"app":"fumble","version":1,"exportedAt":"2026-07-29T00:00:00.000Z","data":{"fumble-x":"bad"}}',
      ),
    ).toThrow(SyntaxError);
  });

  it('creates a stable filename', () => {
    expect(backupFilename(new Date('2026-07-29T12:00:00.000Z'))).toBe(
      'fumble-backup-2026-07-29.json',
    );
  });

  it('skips storage keys without values', () => {
    const storage = {
      length: 3,
      key: vi
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('fumble-empty')
        .mockReturnValueOnce('fumble-present'),
      getItem: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce('value'),
    } as unknown as Storage;

    expect(createBackup(storage).data).toEqual({ 'fumble-present': 'value' });
  });

  it('rejects oversized, primitive and structurally invalid backups', () => {
    expect(() => parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow(
      'backup-too-large',
    );
    expect(() => parseBackup('null')).toThrow('backup-invalid');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'fumble', version: 1, data: [] })),
    ).toThrow('backup-invalid');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'fumble', version: 1, data: { other: '{}' } })),
    ).toThrow('backup-invalid');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'fumble', version: 1, data: { 'fumble-x': 1 } })),
    ).toThrow('backup-invalid');
  });

  it('restores the previous data when writing the new backup fails', () => {
    const storage = {
      length: 1,
      key: vi.fn().mockReturnValue('fumble-old'),
      getItem: vi.fn().mockReturnValue('{"state":"old"}'),
      removeItem: vi.fn(),
      setItem: vi.fn((key: string) => {
        if (key === 'fumble-new') throw new Error('write-failed');
      }),
    } as unknown as Storage;
    const backup: FumbleBackup = {
      app: 'fumble' as const,
      version: BACKUP_VERSION,
      exportedAt: '2026-07-29T00:00:00.000Z',
      data: { 'fumble-new': '{"state":"new"}' },
    };

    expect(() => restoreBackup(storage, backup)).toThrow('write-failed');
    expect(storage.removeItem).toHaveBeenCalledWith('fumble-new');
    expect(storage.setItem).toHaveBeenCalledWith('fumble-old', '{"state":"old"}');
  });

  it('rejects unsupported formats, invalid dates and invalid storage entries', () => {
    const backup = {
      app: 'fumble',
      version: 1,
      exportedAt: '2026-11-07T00:00:00.000Z',
      data: {},
    };
    for (const exportedAt of ['', 'bad', '1', '2026-02-30T00:00:00.000Z']) {
      expect(() => parseBackup(JSON.stringify({ ...backup, exportedAt }))).toThrow(
        'backup-invalid',
      );
    }
    expect(() => parseBackup(JSON.stringify({ ...backup, version: 2 }))).toThrow(
      'backup-version',
    );
    for (const data of [{ other: '{}' }, { 'fumble-test': 1 }]) {
      expect(() => parseBackup(JSON.stringify({ ...backup, data }))).toThrow(
        'backup-invalid',
      );
    }
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup,
          data: {
            'fumble-characters': JSON.stringify({
              version: 2,
              state: { characters: null },
            }),
          },
        }),
      ),
    ).toThrow('backup-invalid-data');
    const data = Object.fromEntries(
      Array.from({ length: MAX_BACKUP_KEYS + 1 }, (_, i) => [`fumble-${i}`, '{}']),
    );
    expect(() => serializeBackup({ ...backup, app: 'fumble', version: 1, data })).toThrow(
      'backup-too-many-keys',
    );
  });

  it('summarizes saved collections, maps, settings and unknown data without changing them', () => {
    const data = {
      'fumble-characters': JSON.stringify({ state: { characters: { a: {}, b: {} } } }),
      'fumble-sessions': JSON.stringify({ state: { sessions: [{}, {}] } }),
      'fumble-homebrew': JSON.stringify({ state: { entries: [{}] } }),
      'fumble-initiative': JSON.stringify({ state: { combatants: [{}] } }),
      'fumble-soundboard': JSON.stringify({ state: { tracks: [{}, {}, {}] } }),
      'fumble-custom-rolls': JSON.stringify({ state: {} }),
      'fumble-campaign-map-editor:one': '[0,1]',
      'fumble-campaign-map-editor:two': '[]',
      'fumble-locale': '{"state":{"locale":"pl"},"version":1}',
      'fumble-backup-reminder': '{"state":{"lastBackupAt":1},"version":1}',
      'fumble-new-tool': '{}',
      'fumble-roll-history': JSON.stringify({ state: { log: [{}] } }),
    };
    const backup: FumbleBackup = {
      app: 'fumble',
      version: 1,
      exportedAt: '2026-11-07T00:00:00.000Z',
      data,
    };
    expect(summarizeBackup(backup)).toEqual({
      characters: 2,
      sessions: 2,
      contexts: 0,
      homebrew: 1,
      combatants: 1,
      tracks: 3,
      customRolls: 0,
      rolls: 1,
      loot: 0,
      encounters: 0,
      encounterDraft: 0,
      reading: 0,
      maps: 2,
      settings: 2,
      other: 1,
    });
    for (const raw of ['null', '{"state":null}']) {
      expect(() =>
        summarizeBackup({ ...backup, data: { 'fumble-sessions': raw } }),
      ).toThrow('backup-invalid-data');
    }
  });

  it('round trips all saved groups and leaves other site data untouched', () => {
    localStorage.setItem('fumble-locale', '{"state":{"locale":"pl"},"version":1}');
    localStorage.setItem('fumble-campaign-map-editor:test', '[0,5]');
    localStorage.setItem('other-app', 'keep');
    const backup = createBackup(localStorage);
    const restored = parseBackup(serializeBackup(backup));
    localStorage.setItem('fumble-added-later', '{}');
    restoreBackup(localStorage, restored);
    expect(createBackup(localStorage).data).toEqual(backup.data);
    expect(localStorage.getItem('other-app')).toBe('keep');
    restoreBackup(localStorage, { ...restored, data: {} });
    expect(createBackup(localStorage).data).toEqual({});
    expect(localStorage.getItem('other-app')).toBe('keep');
  });

  it('measures how much of the browser storage is used', () => {
    localStorage.clear();
    expect(storageUsage(localStorage)).toBe(0);
    localStorage.setItem('fumble-a', 'x'.repeat(STORAGE_CHARACTER_LIMIT / 2 - 8));
    localStorage.setItem('other', 'y');
    expect(storageUsage(localStorage)).toBeCloseTo(0.5, 3);
    localStorage.clear();
  });
});
