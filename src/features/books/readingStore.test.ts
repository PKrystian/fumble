import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOOK_READING_KEY,
  MAX_READING_POSITIONS,
  emptyBookReading,
  parseBookReading,
  serializeBookReading,
} from './readingData';
import { useBookReading } from './readingStore';
import {
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
  summarizeBackup,
} from '@/features/data/backup';

beforeEach(() => {
  localStorage.clear();
  useBookReading.setState({ data: emptyBookReading, raw: null, status: 'ready' });
  vi.restoreAllMocks();
});

describe('book reading data', () => {
  it('saves a section and preferences, validates a full backup, and clears only reading history', () => {
    const store = useBookReading.getState();
    store.record('xphb', 2, 'abc');
    store.setPreference('wide', true);
    store.setPreference('wholeBook', true);
    localStorage.setItem('fumble-content-mode', '{"version":1,"state":{"mode":"2014"}}');

    const backup = parseBackup(serializeBackup(createBackup(localStorage)));
    expect(summarizeBackup(backup)).toMatchObject({ reading: 1, settings: 2 });
    store.clear();
    expect(parseBookReading(localStorage.getItem(BOOK_READING_KEY)!)).toEqual({
      positions: {},
      wide: true,
      wholeBook: true,
    });
    expect(localStorage.getItem('fumble-content-mode')).toBe(
      backup.data['fumble-content-mode'],
    );
    restoreBackup(localStorage, backup);
    expect(
      parseBookReading(localStorage.getItem(BOOK_READING_KEY)!)?.positions.xphb,
    ).toMatchObject({ chapter: 2, section: 'abc' });
  });

  it('retains a failed write in memory and can retry it', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });
    const store = useBookReading.getState();
    store.record('xphb', 3);
    expect(useBookReading.getState().status).toBe('unsaved');
    expect(useBookReading.getState().data.positions.xphb?.chapter).toBe(3);
    expect(localStorage.getItem(BOOK_READING_KEY)).toBeNull();
    store.retry();
    expect(useBookReading.getState().status).toBe('ready');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('preserves unreadable data and a newer external value until explicitly replaced', () => {
    const store = useBookReading.getState();
    localStorage.setItem(BOOK_READING_KEY, 'broken');
    store.acceptStored('broken');
    store.record('xphb', 4);
    expect(useBookReading.getState()).toMatchObject({
      status: 'unreadable',
      raw: 'broken',
    });
    expect(localStorage.getItem(BOOK_READING_KEY)).toBe('broken');
    const other = serializeBookReading({ ...emptyBookReading, wide: true });
    localStorage.setItem(BOOK_READING_KEY, other);
    store.replace('broken');
    expect(useBookReading.getState()).toMatchObject({ status: 'conflict', raw: other });
    expect(localStorage.getItem(BOOK_READING_KEY)).toBe(other);
    store.replace(other);
    expect(useBookReading.getState().status).toBe('ready');
    expect(
      parseBookReading(localStorage.getItem(BOOK_READING_KEY)!)?.positions.xphb?.chapter,
    ).toBe(4);
  });

  it('rejects damaged reading positions during import', () => {
    localStorage.setItem(
      BOOK_READING_KEY,
      JSON.stringify({
        version: 1,
        state: {
          ...emptyBookReading,
          positions: { xphb: { chapter: 0, section: 'bad <id>', updatedAt: 100 } },
        },
      }),
    );
    expect(() => parseBackup(serializeBackup(createBackup(localStorage)))).toThrow(
      'backup-invalid-data',
    );
    expect(() => summarizeBackup(createBackup(localStorage))).toThrow(
      'backup-invalid-data',
    );
  });

  it('keeps the stored copy only after verifying that it is still current', () => {
    const store = useBookReading.getState();
    store.record('xphb', 3);
    const original = localStorage.getItem(BOOK_READING_KEY)!;
    const next = serializeBookReading({ ...emptyBookReading, wide: true });
    localStorage.setItem(BOOK_READING_KEY, next);
    store.setPreference('wholeBook', true);
    store.restoreStored(original);
    expect(useBookReading.getState().status).toBe('conflict');
    store.restoreStored(next);
    expect(useBookReading.getState()).toMatchObject({
      status: 'ready',
      data: { positions: {}, wide: true },
    });
  });

  it('avoids duplicate writes and bounds the history to the newest positions', () => {
    useBookReading.setState({
      data: {
        ...emptyBookReading,
        positions: Object.fromEntries(
          Array.from({ length: MAX_READING_POSITIONS }, (_, index) => [
            `book-${index}`,
            { chapter: 1, updatedAt: index },
          ]),
        ),
      },
    });
    const store = useBookReading.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    store.record('book-1', 1);
    store.record('xphb', 2);
    expect(write).toHaveBeenCalledOnce();
    const positions = useBookReading.getState().data.positions;
    expect(Object.keys(positions)).toHaveLength(MAX_READING_POSITIONS);
    expect(positions['book-0']).toBeUndefined();
    expect(positions.xphb?.chapter).toBe(2);
  });

  it('applies matching cross-tab events and keeps a pending edit during a conflict', () => {
    const store = useBookReading.getState();
    const saved = serializeBookReading({ ...emptyBookReading, wide: true });
    store.acceptStored('unreadable');
    localStorage.setItem(BOOK_READING_KEY, saved);
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(useBookReading.getState().status).toBe('unreadable');
    window.dispatchEvent(new StorageEvent('storage', { key: BOOK_READING_KEY }));
    expect(useBookReading.getState()).toMatchObject({
      status: 'ready',
      data: { wide: true },
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });
    store.record('xphb', 4);
    localStorage.removeItem(BOOK_READING_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    store.retry();
    expect(useBookReading.getState().status).toBe('conflict');
    expect(useBookReading.getState().data.positions.xphb?.chapter).toBe(4);
    expect(localStorage.getItem(BOOK_READING_KEY)).toBeNull();
  });
});
