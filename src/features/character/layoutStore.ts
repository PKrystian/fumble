import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fumbleStorage } from '@/features/storage/safeStorage';

export type LayoutZone = 'left' | 'center' | 'right';

export const LAYOUT_ZONES: LayoutZone[] = ['left', 'center', 'right'];

export const DEFAULT_ZONES: Record<LayoutZone, string[]> = {
  left: ['abilities', 'savingThrows', 'passives'],
  center: ['combat', 'hitPoints', 'tabs'],
  right: ['skills', 'proficiencies', 'tracking', 'spellcasting', 'sessionLog'],
};

export const PANEL_IDS = Object.values(DEFAULT_ZONES).flat();

export const DEFAULT_MOBILE_ORDER = [
  'hitPoints',
  'combat',
  'tabs',
  'abilities',
  'skills',
  'savingThrows',
  'passives',
  'spellcasting',
  'tracking',
  'proficiencies',
  'sessionLog',
];

export const DEFAULT_COLLAPSED = [
  'abilities',
  'skills',
  'savingThrows',
  'passives',
  'spellcasting',
  'tracking',
  'proficiencies',
  'sessionLog',
];

export interface LayoutData {
  zones: Record<LayoutZone, string[]>;
  mobileOrder: string[];
  collapsed: string[];
}

interface LayoutState extends LayoutData {
  movePanel: (id: string, toZone: LayoutZone, toIndex: number) => void;
  movePanelBy: (id: string, offset: -1 | 1) => void;
  moveMobile: (id: string, offset: -1 | 1) => void;
  toggleCollapsed: (id: string) => void;
  applyLayout: (value: unknown) => boolean;
  reset: () => void;
}

const known = new Set(PANEL_IDS);

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeZones(source: Record<string, unknown>): Record<LayoutZone, string[]> {
  const seen = new Set<string>();
  const zones: Record<LayoutZone, string[]> = { left: [], center: [], right: [] };
  for (const zone of LAYOUT_ZONES) {
    const list = source[zone];
    if (!isStringList(list)) continue;
    for (const id of list) {
      if (!known.has(id) || seen.has(id)) continue;
      seen.add(id);
      zones[zone].push(id);
    }
  }
  for (const zone of LAYOUT_ZONES) {
    for (const id of DEFAULT_ZONES[zone]) {
      if (!seen.has(id)) zones[zone].push(id);
    }
  }
  return zones;
}

function normalizeOrder(value: unknown): string[] {
  const order = [...new Set(isStringList(value) ? value : [])].filter((id) =>
    known.has(id),
  );
  return [...order, ...DEFAULT_MOBILE_ORDER.filter((id) => !order.includes(id))];
}

export function readLayout(value: unknown): LayoutData | null {
  if (!isObject(value) || !isObject(value.zones)) return null;
  return {
    zones: normalizeZones(value.zones),
    mobileOrder: normalizeOrder(value.mobileOrder),
    collapsed: isStringList(value.collapsed)
      ? value.collapsed.filter((id) => known.has(id))
      : DEFAULT_COLLAPSED,
  };
}

export function findPanelZone(
  zones: Record<LayoutZone, string[]>,
  id: string,
): LayoutZone | undefined {
  return LAYOUT_ZONES.find((zone) => zones[zone].includes(id));
}

function defaults(): LayoutData {
  return {
    zones: DEFAULT_ZONES,
    mobileOrder: DEFAULT_MOBILE_ORDER,
    collapsed: DEFAULT_COLLAPSED,
  };
}

function moveWithin(list: string[], id: string, offset: -1 | 1): string[] | null {
  const index = list.indexOf(id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= list.length) return null;
  const next = [...list];
  next.splice(index, 1);
  next.splice(target, 0, id);
  return next;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      ...defaults(),
      movePanel: (id, toZone, toIndex) =>
        set((state) => {
          const zones: Record<LayoutZone, string[]> = {
            left: state.zones.left.filter((p) => p !== id),
            center: state.zones.center.filter((p) => p !== id),
            right: state.zones.right.filter((p) => p !== id),
          };
          const target = [...zones[toZone]];
          target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, id);
          zones[toZone] = target;
          return { zones };
        }),
      movePanelBy: (id, offset) =>
        set((state) => {
          const zone = findPanelZone(state.zones, id);
          const list = zone ? moveWithin(state.zones[zone], id, offset) : null;
          return zone && list ? { zones: { ...state.zones, [zone]: list } } : state;
        }),
      moveMobile: (id, offset) =>
        set((state) => {
          const list = moveWithin(state.mobileOrder, id, offset);
          return list ? { mobileOrder: list } : state;
        }),
      toggleCollapsed: (id) =>
        set((state) => ({
          collapsed: state.collapsed.includes(id)
            ? state.collapsed.filter((entry) => entry !== id)
            : [...state.collapsed, id],
        })),
      applyLayout: (value) => {
        const layout = readLayout(value);
        if (!layout) return false;
        set(layout);
        return true;
      },
      reset: () => set(defaults()),
    }),
    {
      name: 'fumble-sheet-layout',
      version: 2,
      storage: fumbleStorage,
      partialize: ({ zones, mobileOrder, collapsed }) => ({
        zones,
        mobileOrder,
        collapsed,
      }),
      migrate: (persisted) => readLayout(persisted) ?? defaults(),
      merge: (persisted, current) => ({ ...current, ...(readLayout(persisted) ?? {}) }),
    },
  ),
);

export function layoutSnapshot(): LayoutData {
  const { zones, mobileOrder, collapsed } = useLayoutStore.getState();
  return { zones, mobileOrder, collapsed };
}
