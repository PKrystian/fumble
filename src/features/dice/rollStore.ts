import { create } from 'zustand';
import { type RollMode, type RollOutcome, parseExpression, rollParsed } from './engine';

export interface RollLogEntry {
  id: string;
  outcome: RollOutcome;

  label?: string;
}

interface RollState {
  log: RollLogEntry[];

  dockOpen: boolean;

  roll: (expression: string, mode?: RollMode, label?: string) => RollOutcome | null;

  pushOutcome: (outcome: RollOutcome, label?: string) => void;
  closeDock: () => void;
  clearLog: () => void;
}

const MAX_LOG = 50;

export const useRollStore = create<RollState>((set) => ({
  log: [],
  dockOpen: false,
  roll: (expression, mode = 'normal', label) => {
    const parsed = parseExpression(expression);
    if (!parsed) return null;
    const outcome = rollParsed(parsed, mode);
    set((state) => ({
      log: [
        { id: crypto.randomUUID(), outcome, ...(label ? { label } : {}) },
        ...state.log,
      ].slice(0, MAX_LOG),
      dockOpen: true,
    }));
    return outcome;
  },
  pushOutcome: (outcome, label) =>
    set((state) => ({
      log: [
        { id: crypto.randomUUID(), outcome, ...(label ? { label } : {}) },
        ...state.log,
      ].slice(0, MAX_LOG),
      dockOpen: true,
    })),
  closeDock: () => set({ dockOpen: false }),
  clearLog: () => set({ log: [], dockOpen: false }),
}));
