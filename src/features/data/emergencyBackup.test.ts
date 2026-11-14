import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('@/features/storage/downloadFile', () => ({ downloadTextFile: mocks.download }));

import { downloadStoredBackup } from './emergencyBackup';

describe('downloadStoredBackup', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.download.mockReset();
  });

  it('downloads the Fumble keys stored in this browser', () => {
    localStorage.setItem('fumble-locale', '{"state":{"locale":"pl"},"version":1}');
    localStorage.setItem('other', 'ignored');
    expect(downloadStoredBackup()).toBe(true);
    const [text, filename] = mocks.download.mock.calls[0] as [string, string];
    expect(Object.keys((JSON.parse(text) as { data: object }).data)).toEqual([
      'fumble-locale',
    ]);
    expect(filename).toMatch(/^fumble-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('reports a failed download', () => {
    mocks.download.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(downloadStoredBackup()).toBe(false);
  });
});
