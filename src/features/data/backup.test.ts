import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_VERSION,
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
} from './backup';

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
});
