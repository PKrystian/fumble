import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FumbleHomebrewState {
  showInCompendium: boolean;
  setShowInCompendium: (show: boolean) => void;
}

export const useFumbleHomebrewStore = create<FumbleHomebrewState>()(
  persist(
    (set) => ({
      showInCompendium: false,
      setShowInCompendium: (show) => set({ showInCompendium: show }),
    }),
    { name: 'fumble-homebrew-visibility', version: 1 },
  ),
);
