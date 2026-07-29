import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutZone = 'left' | 'center' | 'right';

export const DEFAULT_ZONES: Record<LayoutZone, string[]> = {
  left: ['abilities', 'savingThrows', 'passives'],
  center: ['combat', 'hitPoints', 'tabs'],
  right: ['skills', 'proficiencies', 'tracking', 'spellcasting', 'sessionLog'],
};

interface LayoutState {
  zones: Record<LayoutZone, string[]>;

  movePanel: (id: string, toZone: LayoutZone, toIndex: number) => void;
  reset: () => void;
}

function withNewPanels(
  zones: Record<LayoutZone, string[]>,
): Record<LayoutZone, string[]> {
  const known = new Set(Object.values(zones).flat());
  const merged = { ...zones };
  for (const zone of Object.keys(DEFAULT_ZONES) as LayoutZone[]) {
    const missing = DEFAULT_ZONES[zone].filter((id) => !known.has(id));
    if (missing.length) merged[zone] = [...(merged[zone] ?? []), ...missing];
  }
  return merged;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      zones: DEFAULT_ZONES,
      movePanel: (id, toZone, toIndex) =>
        set((state) => {
          const zones: Record<LayoutZone, string[]> = {
            left: state.zones.left.filter((p) => p !== id),
            center: state.zones.center.filter((p) => p !== id),
            right: state.zones.right.filter((p) => p !== id),
          };
          const target = [...zones[toZone]];
          target.splice(toIndex, 0, id);
          zones[toZone] = target;
          return { zones };
        }),
      reset: () => set({ zones: DEFAULT_ZONES }),
    }),
    {
      name: 'fumble-sheet-layout',
      version: 1,
      merge: (persisted, current) => {
        const persistedZones = (persisted as Partial<LayoutState> | undefined)?.zones;
        return persistedZones
          ? { ...current, zones: withNewPanels(persistedZones) }
          : current;
      },
    },
  ),
);
