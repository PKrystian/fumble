import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fumbleStorage } from '@/features/storage/safeStorage';

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  ac: number | null;
  hpCurrent: number;
  hpMax: number;
  conditions: string;
  isPlayer: boolean;
}

interface InitiativeState {
  combatants: Combatant[];
  round: number;
  turnId: string | null;
  addCombatant: (combatant: Omit<Combatant, 'id'>) => void;
  updateCombatant: (id: string, patch: Partial<Combatant>) => void;
  removeCombatant: (id: string) => void;
  clear: () => void;
  next: () => void;
  previous: () => void;
}

export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort(
    (a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name),
  );
}

export const useInitiativeStore = create<InitiativeState>()(
  persist(
    (set) => ({
      combatants: [],
      round: 0,
      turnId: null,
      addCombatant: (combatant) =>
        set((state) => ({
          combatants: [...state.combatants, { ...combatant, id: crypto.randomUUID() }],
        })),
      updateCombatant: (id, patch) =>
        set((state) => ({
          combatants: state.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCombatant: (id) =>
        set((state) => ({
          combatants: state.combatants.filter((c) => c.id !== id),
          turnId: state.turnId === id ? null : state.turnId,
        })),
      clear: () => set({ combatants: [], round: 0, turnId: null }),
      next: () =>
        set((state) => {
          const sorted = sortCombatants(state.combatants);
          if (sorted.length === 0) return {};
          const index = sorted.findIndex((c) => c.id === state.turnId);
          if (index === -1)
            return { turnId: sorted[0]!.id, round: Math.max(1, state.round) };
          if (index + 1 >= sorted.length) {
            return { turnId: sorted[0]!.id, round: state.round + 1 };
          }
          return { turnId: sorted[index + 1]!.id };
        }),
      previous: () =>
        set((state) => {
          const sorted = sortCombatants(state.combatants);
          if (sorted.length === 0) return {};
          const index = sorted.findIndex((c) => c.id === state.turnId);
          if (index <= 0) {
            return {
              turnId: sorted[sorted.length - 1]!.id,
              round: Math.max(1, state.round - 1),
            };
          }
          return { turnId: sorted[index - 1]!.id };
        }),
    }),
    { name: 'fumble-initiative', version: 1, storage: fumbleStorage },
  ),
);
