import { create } from 'zustand';
import {
  emptyInitiative,
  INITIATIVE_KEY,
  parseStoredInitiative,
  serializeInitiative,
  sortCombatants,
  type InitiativeData,
  type NewCombatant,
} from './model';

export type SaveStatus = 'saved' | 'unsaved' | 'unreadable' | 'conflict';

interface InitiativeState extends InitiativeData {
  status: SaveStatus;
  raw: string | null;
  dirty: boolean;
  undoData: InitiativeData | null;
  addCombatant: (combatant: NewCombatant) => boolean;
  addCombatants: (combatants: NewCombatant[]) => boolean;
  updateCombatant: (id: string, patch: Partial<NewCombatant>) => boolean;
  removeCombatant: (id: string) => boolean;
  moveTie: (id: string, offset: -1 | 1) => void;
  clear: () => boolean;
  undo: () => boolean;
  next: () => void;
  previous: () => void;
  checkStorage: () => boolean;
  retrySave: () => void;
  reloadStored: () => boolean;
  replaceStored: (expected: string | null, data?: InitiativeData) => boolean;
  restore: (data: InitiativeData) => boolean;
}

function readRaw() {
  try {
    const raw =
      typeof window === 'undefined' ? null : window.localStorage.getItem(INITIATIVE_KEY);
    return { raw, readable: true };
  } catch {
    return { raw: null, readable: false };
  }
}

function decode(raw: string | null) {
  return raw === null ? emptyInitiative() : parseStoredInitiative(raw);
}

function snapshot({ combatants, round, turnId }: InitiativeData): InitiativeData {
  return { combatants, round, turnId };
}

export function createInitiativeStore() {
  return create<InitiativeState>((set, get) => {
    const initial = readRaw();
    const initialData = initial.readable ? decode(initial.raw) : null;
    let lastStored = initial.raw;
    let hasBaseline = Boolean(initialData);
    let confirmedUnreadable = false;

    const checkStorage = () => {
      const { raw, readable } = readRaw();
      if (readable && hasBaseline && raw === lastStored) {
        const { status, dirty } = get();
        if (status === 'conflict' || status === 'unreadable') {
          set({
            status: dirty ? 'unsaved' : 'saved',
            raw: confirmedUnreadable ? raw : null,
          });
        }
        return true;
      }
      set({ status: readable && decode(raw) ? 'conflict' : 'unreadable', raw });
      return false;
    };

    const write = (data: InitiativeData, undoData: InitiativeData | null) => {
      const serialized = serializeInitiative(data);
      try {
        window.localStorage.setItem(INITIATIVE_KEY, serialized);
      } catch {
        set({
          ...data,
          undoData,
          status: 'unsaved',
          raw: confirmedUnreadable ? lastStored : null,
          dirty: true,
        });
        return;
      }
      lastStored = serialized;
      hasBaseline = true;
      confirmedUnreadable = false;
      set({ ...data, undoData, status: 'saved', raw: null, dirty: false });
    };

    const commit = (data: InitiativeData, undoData: InitiativeData | null = null) => {
      if (!checkStorage()) return false;
      write(data, undoData);
      return true;
    };

    const addCombatants = (rows: NewCombatant[]) => {
      if (rows.length === 0) return false;
      const data = snapshot(get());
      return commit({
        ...data,
        combatants: [
          ...data.combatants,
          ...rows.map((row) => ({ ...row, id: crypto.randomUUID() })),
        ],
      });
    };

    return {
      ...(initialData ?? emptyInitiative()),
      status: initialData ? 'saved' : 'unreadable',
      raw: initialData ? null : initial.raw,
      dirty: false,
      undoData: null,
      addCombatant: (row) => addCombatants([row]),
      addCombatants,
      updateCombatant: (id, patch) => {
        const data = snapshot(get());
        if (!data.combatants.some((row) => row.id === id)) return false;
        return commit({
          ...data,
          combatants: data.combatants.map((row) =>
            row.id === id ? { ...row, ...patch } : row,
          ),
        });
      },
      removeCombatant: (id) => {
        const data = snapshot(get());
        const index = data.combatants.findIndex((row) => row.id === id);
        if (index < 0) return false;
        const combatants = data.combatants.filter((row) => row.id !== id);
        if (combatants.length === 0) return commit(emptyInitiative(), data);
        if (data.turnId !== id) return commit({ ...data, combatants }, data);
        const ordered = sortCombatants(data.combatants);
        const successor = ordered[ordered.findIndex((row) => row.id === id) + 1];
        return commit(
          {
            combatants,
            turnId: successor?.id ?? ordered[0]!.id,
            round: successor
              ? data.round
              : Math.min(data.round + 1, Number.MAX_SAFE_INTEGER),
          },
          data,
        );
      },
      moveTie: (id, offset) => {
        const data = snapshot(get());
        const ordered = sortCombatants(data.combatants);
        const index = ordered.findIndex((row) => row.id === id);
        const row = ordered[index];
        const neighbor = ordered[index + offset];
        if (!row || !neighbor || row.initiative !== neighbor.initiative) return;
        const combatants = data.combatants.map((item) =>
          item.id === row.id ? neighbor : item.id === neighbor.id ? row : item,
        );
        commit({ ...data, combatants });
      },
      clear: () =>
        get().combatants.length > 0 && commit(emptyInitiative(), snapshot(get())),
      undo: () => {
        const data = get().undoData;
        return data ? commit(data) : false;
      },
      next: () => {
        const data = snapshot(get());
        const ordered = sortCombatants(data.combatants);
        if (ordered.length === 0) return;
        const index = ordered.findIndex((row) => row.id === data.turnId);
        const next = ordered[index + 1];
        commit({
          ...data,
          round:
            index === -1
              ? Math.max(1, data.round)
              : next
                ? data.round
                : Math.min(data.round + 1, Number.MAX_SAFE_INTEGER),
          turnId: (next ?? ordered[0]!).id,
        });
      },
      previous: () => {
        const data = snapshot(get());
        if (!data.turnId) return;
        const ordered = sortCombatants(data.combatants);
        const index = ordered.findIndex((row) => row.id === data.turnId);
        if (index < 0 || (index === 0 && data.round <= 1)) return;
        const previous = ordered[index - 1];
        const row = previous ?? ordered.at(-1);
        if (row)
          commit({
            ...data,
            turnId: row.id,
            round: previous ? data.round : data.round - 1,
          });
      },
      checkStorage,
      retrySave: () => {
        if (checkStorage() && get().dirty) write(snapshot(get()), get().undoData);
      },
      reloadStored: () => {
        const { raw, readable } = readRaw();
        const data = readable ? decode(raw) : null;
        if (!data) {
          set({ status: 'unreadable', raw });
          return false;
        }
        lastStored = raw;
        hasBaseline = true;
        confirmedUnreadable = false;
        set({ ...data, status: 'saved', raw: null, dirty: false, undoData: null });
        return true;
      },
      replaceStored: (expected, replacement = snapshot(get())) => {
        const { raw, readable } = readRaw();
        if (!readable || raw !== expected) {
          checkStorage();
          return false;
        }
        lastStored = raw;
        hasBaseline = true;
        confirmedUnreadable = !decode(raw);
        write(replacement, null);
        return true;
      },
      restore: (data) => commit(data),
    };
  });
}

export const useInitiativeStore = createInitiativeStore();
