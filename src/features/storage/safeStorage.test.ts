import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  followStoredChanges,
  readLocalStorage,
  removeLocalStorage,
  STORAGE_ERROR_EVENT,
  writeLocalStorage,
} from './safeStorage';

describe('safe local storage helpers', () => {
  beforeEach(() => {
    window.localStorage?.clear();
    vi.restoreAllMocks();
  });

  it('reads, writes and removes values', () => {
    expect(readLocalStorage('missing')).toBeNull();
    expect(writeLocalStorage('fumble-test', 'value')).toBe(true);
    expect(readLocalStorage('fumble-test')).toBe('value');
    expect(removeLocalStorage('fumble-test')).toBe(true);
    expect(readLocalStorage('fumble-test')).toBeNull();
  });

  it('reports storage operation failures and keeps the app running', () => {
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failed');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('write failed');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('remove failed');
    });

    expect(readLocalStorage('fumble-read')).toBeNull();
    expect(writeLocalStorage('fumble-write', 'value')).toBe(false);
    expect(removeLocalStorage('fumble-remove')).toBe(false);
    expect(dispatch).toHaveBeenCalled();
    expect(
      dispatch.mock.calls.every(
        ([event]) => event instanceof CustomEvent && event.type === STORAGE_ERROR_EVENT,
      ),
    ).toBe(true);
  });

  it('returns a safe result when localStorage is unavailable', () => {
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue(null as never);

    expect(readLocalStorage('missing')).toBeNull();
    expect(writeLocalStorage('fumble-test', 'value')).toBe(false);
    expect(removeLocalStorage('fumble-test')).toBe(true);
  });

  it('reloads after another tab changes the followed key or clears storage', () => {
    const reload = vi.fn();
    followStoredChanges('fumble-followed', reload);
    window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-other' }));
    expect(reload).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-followed' }));
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('returns safe results when the browser window is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(() => followStoredChanges('fumble-test', vi.fn())).not.toThrow();

    expect(readLocalStorage('missing')).toBeNull();
    expect(writeLocalStorage('fumble-test', 'value')).toBe(false);
    expect(removeLocalStorage('fumble-test')).toBe(true);

    vi.unstubAllGlobals();
  });
});
