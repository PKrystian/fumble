import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
  summarizeBackup,
} from '@/features/data/backup';
import { emptyLootData, isLootData, LOOT_KEY, type LootResult } from './lootData';
import { serializeLoot, useLootStore } from './lootStore';
import { lootBackup } from './lootFiles';

const result: LootResult = {
  id: 'reward',
  name: 'Treasure',
  createdAt: 1,
  context: {
    mode: 'tier',
    reward: 'hoard',
    tierId: 1,
    partySize: 0,
    partyLevel: 1,
    party: [],
    edition: 'all',
    includeUnknown: false,
  },
  gold: 10,
  gemCount: 0,
  gemValue: 0,
  items: [],
  splitCount: '1',
  splitEnabled: false,
};
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  useLootStore.getState().reload();
});

describe('loot local persistence', () => {
  it('follows changes from another tab unless this tab has unsaved or blocked data', () => {
    const other = { ...emptyLootData(), history: [result], selectedId: result.id };
    localStorage.setItem(LOOT_KEY, serializeLoot(other));
    window.dispatchEvent(new StorageEvent('storage', { key: LOOT_KEY }));
    expect(useLootStore.getState().data.history).toEqual([result]);

    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    useLootStore.getState().deleteResult(result.id);
    write.mockRestore();
    window.dispatchEvent(new StorageEvent('storage', { key: LOOT_KEY }));
    expect(useLootStore.getState().saved).toBe(false);
    expect(useLootStore.getState().data.history).toEqual([]);
  });

  it('keeps fifty rewards and preserves naming, selection and settings after reload', () => {
    const store = useLootStore.getState();
    store.updateSettings({ mode: 'tier', tierId: 4, search: 'private' });
    for (let index = 0; index < 51; index++)
      store.addResult({ ...result, id: String(index) });
    store.updateResult('50', { name: 'Dragon reward' });
    store.selectResult('49');
    store.selectResult('missing');
    store.reload();
    expect(useLootStore.getState().data).toMatchObject({
      settings: { mode: 'tier', tierId: 4, search: 'private' },
      selectedId: '49',
    });
    expect(useLootStore.getState().data.history).toHaveLength(50);
    expect(useLootStore.getState().data.history.at(-1)!.id).toBe('1');
    expect(useLootStore.getState().data.history[0]!.name).toBe('Dragon reward');
    expect(isLootData(useLootStore.getState().data)).toBe(true);
    store.deleteResult('48');
    expect(useLootStore.getState().data.selectedId).toBe('49');
    store.deleteResult('49');
    expect(useLootStore.getState().data.selectedId).toBe('50');
    for (const row of useLootStore.getState().data.history) store.deleteResult(row.id);
    expect(useLootStore.getState().data.selectedId).toBeNull();
    expect(useLootStore.getState().data.history).toEqual([]);
  });

  it('retains unsaved in-memory changes and exports them while retrying a failed write', () => {
    const store = useLootStore.getState();
    store.addResult(result);
    const raw = localStorage.getItem(LOOT_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    store.updateResult(result.id, { name: 'Unsaved' });
    expect(useLootStore.getState().saved).toBe(false);
    expect(localStorage.getItem(LOOT_KEY)).toBe(raw);
    expect(lootBackup(useLootStore.getState().data).loot.state.history[0]!.name).toBe(
      'Unsaved',
    );
    write.mockRestore();
    store.retrySave();
    expect(useLootStore.getState().saved).toBe(true);
    expect(JSON.parse(localStorage.getItem(LOOT_KEY)!).state.history[0].name).toBe(
      'Unsaved',
    );
  });

  it('preserves corrupt, future and duplicate snapshots until explicit replacement succeeds', () => {
    const store = useLootStore.getState();
    localStorage.setItem('fumble-other', 'keep');
    for (const raw of [
      '{broken',
      JSON.stringify({ version: 9, state: emptyLootData() }),
      serializeLoot({ ...emptyLootData(), history: [result, result] }),
    ]) {
      localStorage.setItem(LOOT_KEY, raw);
      store.reload();
      expect(useLootStore.getState()).toMatchObject({ blocked: true, saved: false, raw });
      store.updateSettings({ mode: 'wildcard' });
      store.retrySave();
      expect(localStorage.getItem(LOOT_KEY)).toBe(raw);
      const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      store.replaceUnreadable();
      expect(useLootStore.getState().blocked).toBe(true);
      expect(localStorage.getItem(LOOT_KEY)).toBe(raw);
      write.mockRestore();
      store.replaceUnreadable();
      expect(useLootStore.getState()).toMatchObject({
        blocked: false,
        saved: true,
        raw: null,
        data: emptyLootData(),
      });
      expect(localStorage.getItem('fumble-other')).toBe('keep');
    }
  });

  it('reports unavailable storage, allows retrying reads and renders safely without a browser', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    useLootStore.getState().reload();
    expect(useLootStore.getState()).toMatchObject({
      blocked: true,
      saved: false,
      raw: null,
    });
    read.mockRestore();
    useLootStore.getState().reload();
    expect(useLootStore.getState().blocked).toBe(false);
    vi.stubGlobal('window', undefined);
    useLootStore.getState().reload();
    expect(useLootStore.getState().data).toEqual(emptyLootData());
    vi.unstubAllGlobals();
  });

  it('round trips through the general backup and replaces only loot in scoped restores', () => {
    const store = useLootStore.getState();
    localStorage.setItem('fumble-locale', '{"state":{"locale":"pl"},"version":1}');
    localStorage.setItem('other-app', 'keep');
    store.addResult(result);
    const backup = parseBackup(serializeBackup(createBackup(localStorage)));
    expect(summarizeBackup(backup).loot).toBe(1);
    store.deleteResult(result.id);
    restoreBackup(localStorage, backup);
    store.reload();
    expect(useLootStore.getState().data.history).toEqual([result]);
    store.replaceData(emptyLootData());
    expect(localStorage.getItem('fumble-locale')).toContain('pl');
    expect(localStorage.getItem('other-app')).toBe('keep');
    expect(() =>
      parseBackup(
        JSON.stringify({ ...backup, data: { [LOOT_KEY]: '{"version":99,"state":{}}' } }),
      ),
    ).toThrow('backup-invalid-data');
  });
});
