import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { followStoredChanges, fumbleStorage } from '@/features/storage/safeStorage';
import {
  DiceError,
  validateExpression,
  rollParsed,
  type RollError,
  type RollMode,
  type RollOutcome,
} from './engine';
import { rollDamage, type DamageComponent, type TargetDefenses } from './damage';
import { isRollLogEntry } from './validation';

export interface RollLogEntry {
  id: string;
  outcome: RollOutcome;
  label?: string;
  createdAt?: number;
}
interface RollState {
  log: RollLogEntry[];
  dockOpen: boolean;
  error: RollError | null;
  roll: (expression: string, mode?: RollMode, label?: string) => RollOutcome | null;
  damageRoll: (
    components: DamageComponent[],
    defenses: TargetDefenses,
    label?: string,
  ) => RollOutcome | null;
  reroll: (entry: RollLogEntry, mode?: RollMode) => RollOutcome | null;
  pushOutcome: (outcome: RollOutcome, label?: string) => void;
  closeDock: () => void;
  clearLog: () => void;
  clearError: () => void;
}
export const MAX_LOG = 50;

export const useRollStore = create<RollState>()(
  persist(
    (set, get) => {
      const run = (build: () => RollOutcome, label?: string) => {
        try {
          const outcome = build();
          get().pushOutcome(outcome, label);
          return outcome;
        } catch (error) {
          if (!(error instanceof DiceError)) throw error;
          set({ error: error.code });
          return null;
        }
      };
      return {
        log: [],
        dockOpen: false,
        error: null,
        roll: (expression, mode = 'normal', label) => {
          const result = validateExpression(expression);
          if (!result.parsed) {
            set({ error: result.error });
            return null;
          }
          return run(() => rollParsed(result.parsed!, mode), label);
        },
        damageRoll: (components, defenses, label) =>
          run(() => rollDamage(components, defenses), label),
        reroll: (entry, mode) => {
          const damage = entry.outcome.damage;
          if (damage)
            return get().damageRoll(
              damage.parts.map((part) => part.component),
              Object.fromEntries(
                damage.totals.map((group) => [group.type, group.defense]),
              ),
              entry.label,
            );
          return get().roll(
            entry.outcome.expression,
            mode ?? entry.outcome.mode,
            entry.label,
          );
        },
        pushOutcome: (outcome, label) =>
          set((state) => ({
            log: [
              {
                id: crypto.randomUUID(),
                outcome,
                ...(label ? { label } : {}),
                createdAt: Date.now(),
              },
              ...state.log,
            ].slice(0, MAX_LOG),
            dockOpen: true,
            error: null,
          })),
        closeDock: () => set({ dockOpen: false }),
        clearLog: () => set({ log: [], dockOpen: false, error: null }),
        clearError: () => set({ error: null }),
      };
    },
    {
      name: 'fumble-roll-history',
      version: 1,
      storage: fumbleStorage,
      partialize: (state) => ({ log: state.log }),
      merge: (persisted, current) => {
        const log = (persisted as { log?: unknown } | undefined)?.log;
        return {
          ...current,
          log: Array.isArray(log) ? log.filter(isRollLogEntry).slice(0, MAX_LOG) : [],
        };
      },
    },
  ),
);

followStoredChanges('fumble-roll-history', () => void useRollStore.persist.rehydrate());
