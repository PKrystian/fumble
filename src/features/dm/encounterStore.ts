import { create } from 'zustand';
import { followStoredChanges, writeLocalStorage } from '@/features/storage/safeStorage';
import {
  emptyEncounter,
  emptyEncounterData,
  ENCOUNTER_KEY,
  ENCOUNTER_VERSION,
  ENCOUNTER_LIMIT,
  ENCOUNTER_COUNT_LIMIT,
  parseStoredEncounter,
  partyNumber,
  type EncounterData,
  type EncounterDraft,
} from './encounterModel';

export function serializeEncounter(data: EncounterData): string {
  return JSON.stringify({ state: data, version: ENCOUNTER_VERSION });
}

function readEncounter() {
  let raw: string | null = null;
  try {
    raw =
      typeof window === 'undefined' ? null : window.localStorage.getItem(ENCOUNTER_KEY);
    if (raw === null) return { data: emptyEncounterData(), blocked: false, raw };
    const data = parseStoredEncounter(raw);
    if (data) return { data, blocked: false, raw };
  } catch {
    return { data: emptyEncounterData(), blocked: true, raw };
  }
  return { data: emptyEncounterData(), blocked: true, raw };
}

interface EncounterState {
  data: EncounterData;
  saved: boolean;
  blocked: boolean;
  raw: string | null;
  edit: (patch: Partial<EncounterDraft>) => void;
  startNew: () => void;
  saveNamed: () => void;
  open: (id: string) => void;
  duplicate: (id: string, name: string) => void;
  remove: (id: string) => void;
  restore: (data: EncounterData) => void;
  retrySave: () => void;
  retryRead: () => void;
  replaceUnreadable: () => void;
}

export const useEncounterStore = create<EncounterState>((set, get) => {
  const initial = readEncounter();
  let lastStored = initial.raw;
  let dirty = false;
  const write = (data: EncounterData) => {
    const serialized = serializeEncounter(data);
    const saved = writeLocalStorage(ENCOUNTER_KEY, serialized);
    if (saved) {
      lastStored = serialized;
      dirty = false;
    }
    set({ data, saved });
    return saved;
  };
  const commit = (data: EncounterData) => {
    dirty = true;
    if (get().blocked) {
      set({ data, saved: false });
      return;
    }
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(ENCOUNTER_KEY);
    } catch {
      set({ data, saved: false });
      return;
    }
    if (raw !== lastStored) {
      set({ data, saved: false, blocked: true, raw });
      return;
    }
    write(data);
  };
  return {
    data: initial.data,
    saved: !initial.blocked,
    blocked: initial.blocked,
    raw: initial.blocked ? initial.raw : null,
    edit: (patch) => {
      const { data } = get();
      commit({ ...data, draft: { ...data.draft, ...patch } });
    },
    startNew: () => commit({ ...get().data, draft: emptyEncounter(), selectedId: null }),
    saveNamed: () => {
      const { data } = get();
      if (!data.selectedId && data.library.length >= ENCOUNTER_LIMIT) return;
      if (
        !data.draft.name.trim() ||
        !data.draft.party.every(
          ({ count, level }) =>
            partyNumber(count, ENCOUNTER_COUNT_LIMIT) && partyNumber(level, 20),
        )
      )
        return;
      const id = data.selectedId ?? crypto.randomUUID();
      const draft = { ...data.draft, name: data.draft.name.trim() };
      const item = { ...draft, id };
      const library = [item, ...data.library.filter((row) => row.id !== id)];
      commit({ draft, library, selectedId: id });
    },
    open: (id) => {
      const { data } = get();
      const item = data.library.find((row) => row.id === id);
      if (!item) return;
      const { name, party, monsters, target } = item;
      commit({ ...data, draft: { name, party, monsters, target }, selectedId: id });
    },
    duplicate: (id, name) => {
      const { data } = get();
      const item = data.library.find((row) => row.id === id);
      if (item && data.library.length < ENCOUNTER_LIMIT)
        commit({
          ...data,
          library: [{ ...item, id: crypto.randomUUID(), name }, ...data.library],
        });
    },
    remove: (id) => {
      const { data } = get();
      commit({
        ...data,
        library: data.library.filter((row) => row.id !== id),
        selectedId: data.selectedId === id ? null : data.selectedId,
      });
    },
    restore: (data) => commit(data),
    retrySave: () => commit(get().data),
    retryRead: () => {
      const result = readEncounter();
      if (!result.blocked && !dirty) {
        lastStored = result.raw;
        set({ data: result.data, saved: true, blocked: false, raw: null });
      } else if (!result.blocked && result.raw === null && get().raw === null) {
        lastStored = null;
        set({ blocked: false, raw: null });
        commit(get().data);
      } else {
        set({ raw: result.raw ?? get().raw });
      }
    },
    replaceUnreadable: () => {
      const { data, raw } = get();
      const current = readEncounter();
      if (current.raw !== raw) set({ raw: current.raw ?? raw });
      else if (write(data)) set({ blocked: false, raw: null });
    },
  };
});

followStoredChanges(ENCOUNTER_KEY, () => {
  const state = useEncounterStore.getState();
  if (state.saved && !state.blocked) state.retryRead();
});
