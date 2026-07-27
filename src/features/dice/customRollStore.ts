import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomRoll {
  id: string;
  name: string;
  expression: string;
}

interface CustomRollState {
  customRolls: CustomRoll[];
  addCustomRoll: (name: string, expression: string) => void;
  removeCustomRoll: (id: string) => void;
}

export const useCustomRollStore = create<CustomRollState>()(
  persist(
    (set) => ({
      customRolls: [],
      addCustomRoll: (name, expression) =>
        set((state) => ({
          customRolls: [
            ...state.customRolls,
            { id: crypto.randomUUID(), name: name.trim(), expression: expression.trim() },
          ],
        })),
      removeCustomRoll: (id) =>
        set((state) => ({
          customRolls: state.customRolls.filter((roll) => roll.id !== id),
        })),
    }),
    { name: 'fumble-custom-rolls' },
  ),
);
