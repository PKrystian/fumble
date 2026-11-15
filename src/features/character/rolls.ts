import { create } from 'zustand';
import type { RollMode } from '@/features/dice/engine';
import { useRollStore } from '@/features/dice/rollStore';
import { formatModifier, type Character } from './model';

interface SheetRollModeState {
  mode: RollMode;
  setMode: (mode: RollMode) => void;
}

export const useSheetRollMode = create<SheetRollModeState>((set) => ({
  mode: 'normal',
  setMode: (mode) => set({ mode }),
}));

export const ROLL_MODES: RollMode[] = ['normal', 'advantage', 'disadvantage'];

export const ROLL_MODE_KEYS: Record<RollMode, string> = {
  normal: 'dice.modeNormal',
  advantage: 'dice.modeAdvantage',
  disadvantage: 'dice.modeDisadvantage',
};

export function d20Expression(bonus: number): string {
  return bonus === 0 ? '1d20' : `1d20${formatModifier(bonus)}`;
}

export function rollLabel(character: Character, label: string, fallback: string) {
  return `${character.name.trim() || fallback}: ${label}`;
}

export function useSheetRoll(character: Character, fallbackName: string) {
  const roll = useRollStore((state) => state.roll);
  const mode = useSheetRollMode((state) => state.mode);
  return {
    mode,
    rollCheck: (label: string, bonus: number) =>
      roll(d20Expression(bonus), mode, rollLabel(character, label, fallbackName)),
    rollExpression: (expression: string, label: string) =>
      roll(expression, 'normal', rollLabel(character, label, fallbackName)),
  };
}
