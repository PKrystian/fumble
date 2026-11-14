import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { followStoredChanges, fumbleStorage } from '@/features/storage/safeStorage';
import type { DamageComponent } from './damage';
import type { RollMode } from './engine';
import { isCustomRoll } from './validation';

export interface CustomRoll {
  id: string;
  name: string;
  expression: string;
  mode?: RollMode;
  components?: DamageComponent[];
}
export const MAX_CUSTOM_ROLLS = 100;
interface CustomRollState {
  customRolls: CustomRoll[];
  removed: { roll: CustomRoll; index: number } | null;
  addCustomRoll: (
    name: string,
    expression: string,
    options?: Pick<CustomRoll, 'mode' | 'components'>,
  ) => void;
  updateCustomRoll: (id: string, roll: Omit<CustomRoll, 'id'>) => void;
  removeCustomRoll: (id: string) => void;
  undoRemove: () => void;
}
export const useCustomRollStore = create<CustomRollState>()(
  persist(
    (set) => ({
      customRolls: [],
      removed: null,
      addCustomRoll: (name, expression, options = {}) =>
        set((state) => {
          const roll = {
            ...options,
            id: crypto.randomUUID(),
            name: name.trim(),
            expression: expression.trim(),
          };
          return isCustomRoll(roll) && state.customRolls.length < MAX_CUSTOM_ROLLS
            ? { customRolls: [...state.customRolls, roll], removed: null }
            : {};
        }),
      updateCustomRoll: (id, roll) =>
        set((state) =>
          isCustomRoll({ ...roll, id })
            ? {
                customRolls: state.customRolls.map((entry) =>
                  entry.id === id
                    ? {
                        ...roll,
                        id,
                        name: roll.name.trim(),
                        expression: roll.expression.trim(),
                      }
                    : entry,
                ),
              }
            : {},
        ),
      removeCustomRoll: (id) =>
        set((state) => {
          const index = state.customRolls.findIndex((roll) => roll.id === id);
          return index < 0
            ? {}
            : {
                removed: { roll: state.customRolls[index]!, index },
                customRolls: state.customRolls.filter((roll) => roll.id !== id),
              };
        }),
      undoRemove: () =>
        set((state) => {
          if (!state.removed || state.customRolls.length >= MAX_CUSTOM_ROLLS) return {};
          const customRolls = [...state.customRolls];
          customRolls.splice(state.removed.index, 0, state.removed.roll);
          return { customRolls, removed: null };
        }),
    }),
    {
      name: 'fumble-custom-rolls',
      version: 1,
      storage: fumbleStorage,
      partialize: (state) => ({ customRolls: state.customRolls }),
      migrate: (persisted) => persisted as CustomRollState,
      merge: (persisted, current) => {
        const rolls = (persisted as { customRolls?: unknown } | undefined)?.customRolls;
        return {
          ...current,
          customRolls: Array.isArray(rolls)
            ? rolls.filter(isCustomRoll).slice(0, MAX_CUSTOM_ROLLS)
            : [],
        };
      },
    },
  ),
);

followStoredChanges(
  'fumble-custom-rolls',
  () => void useCustomRollStore.persist.rehydrate(),
);
