import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, downloadTextFile } from './downloadFile';

describe('file downloads', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('downloads text and blobs with named files', () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    downloadTextFile('{}', 'data.json');
    expect(revoke).toHaveBeenCalledTimes(1);
    downloadBlob(new Blob(['pdf']), 'sheet.pdf');
    expect(names).toEqual(['data.json', 'sheet.pdf']);
    expect(revoke).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(document.querySelector('a')).toBeNull();
  });
});
