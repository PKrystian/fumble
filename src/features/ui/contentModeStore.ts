import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContentMode = '2024' | '2014' | 'all';

interface ContentModeState {
  mode: ContentMode;
  setMode: (mode: ContentMode) => void;
}

export const useContentModeStore = create<ContentModeState>()(
  persist(
    (set) => ({
      mode: 'all',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'fumble-content-mode', version: 1 },
  ),
);
