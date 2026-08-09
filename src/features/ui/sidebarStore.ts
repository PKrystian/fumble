import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fumbleStorage } from '@/features/storage/safeStorage';

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: 'fumble-sidebar', version: 1, storage: fumbleStorage },
  ),
);
