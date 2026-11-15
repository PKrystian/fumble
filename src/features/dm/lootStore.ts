import { create } from 'zustand';
import { followStoredChanges, writeLocalStorage } from '@/features/storage/safeStorage';
import {
  emptyLootData,
  isLootBackup,
  LOOT_HISTORY_LIMIT,
  LOOT_KEY,
  LOOT_VERSION,
  type LootData,
  type LootResult,
  type LootSettings,
} from './lootData';

export function serializeLoot(data: LootData): string {
  return JSON.stringify({ state: data, version: LOOT_VERSION });
}

function readLoot() {
  let raw: string | null = null;
  try {
    raw = typeof window === 'undefined' ? null : window.localStorage.getItem(LOOT_KEY);
    if (raw === null) return { data: emptyLootData(), saved: true, blocked: false, raw };
    const value: unknown = JSON.parse(raw);
    if (!isLootBackup(value)) throw new Error('invalid-loot');
    return { data: value.state, saved: true, blocked: false, raw: null };
  } catch {
    return { data: emptyLootData(), saved: false, blocked: true, raw };
  }
}

interface LootState {
  data: LootData;
  saved: boolean;
  blocked: boolean;
  raw: string | null;
  updateSettings: (patch: Partial<LootSettings>) => void;
  addResult: (result: LootResult) => void;
  updateResult: (
    id: string,
    patch: Partial<Pick<LootResult, 'name' | 'items' | 'splitCount' | 'splitEnabled'>>,
  ) => void;
  selectResult: (id: string) => void;
  deleteResult: (id: string) => void;
  retrySave: () => void;
  reload: () => void;
  replaceUnreadable: () => void;
  replaceData: (data: LootData) => void;
}

export const useLootStore = create<LootState>((set, get) => {
  const commit = (data: LootData) => {
    if (get().blocked) return;
    const saved = writeLocalStorage(LOOT_KEY, serializeLoot(data));
    set({ data, saved });
  };
  return {
    ...readLoot(),
    updateSettings: (patch) =>
      commit({ ...get().data, settings: { ...get().data.settings, ...patch } }),
    addResult: (result) =>
      commit({
        ...get().data,
        history: [result, ...get().data.history].slice(0, LOOT_HISTORY_LIMIT),
        selectedId: result.id,
      }),
    updateResult: (id, patch) =>
      commit({
        ...get().data,
        history: get().data.history.map((result) =>
          result.id === id ? { ...result, ...patch } : result,
        ),
      }),
    selectResult: (id) => {
      if (get().data.history.some((result) => result.id === id))
        commit({ ...get().data, selectedId: id });
    },
    deleteResult: (id) => {
      const data = get().data;
      const history = data.history.filter((result) => result.id !== id);
      commit({
        ...data,
        history,
        selectedId: data.selectedId === id ? (history[0]?.id ?? null) : data.selectedId,
      });
    },
    retrySave: () => commit(get().data),
    replaceData: (data) => commit(data),
    reload: () => set(readLoot()),
    replaceUnreadable: () => {
      const data = emptyLootData();
      const saved = writeLocalStorage(LOOT_KEY, serializeLoot(data));
      if (saved) set({ data, saved, blocked: false, raw: null });
    },
  };
});

followStoredChanges(LOOT_KEY, () => {
  const state = useLootStore.getState();
  if (state.saved && !state.blocked) state.reload();
});
