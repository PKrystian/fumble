import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
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

  it('rejects unrelated or malformed data', () => {
    expect(() => parseBackup('{"app":"other","version":1,"data":{}}')).toThrow(
      'backup-invalid',
    );
    expect(() =>
      parseBackup(
        '{"app":"fumble","version":1,"exportedAt":"x","data":{"fumble-x":"bad"}}',
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
});
