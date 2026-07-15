import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
  id: string;
  name: string;
  videoId: string;
}

const PLACEHOLDER = 'jNQXAC9IVRw';
const DEFAULT_TRACKS: Track[] = [
  { id: 'default-zoo', name: 'Me at the zoo music 123', videoId: PLACEHOLDER },
  { id: 'default-tavern', name: 'Tavern - Relaxed', videoId: PLACEHOLDER },
  { id: 'default-exploration', name: 'Exploration', videoId: PLACEHOLDER },
  { id: 'default-combat', name: 'Combat', videoId: PLACEHOLDER },
  { id: 'default-boss', name: 'Boss Battle', videoId: PLACEHOLDER },
];

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

interface SoundboardState {
  tracks: Track[];
  addTrack: (name: string, videoId: string) => void;
  removeTrack: (id: string) => void;
  moveTrack: (from: number, to: number) => void;
  resetToDefaults: () => void;
}

export const useSoundboardStore = create<SoundboardState>()(
  persist(
    (set) => ({
      tracks: DEFAULT_TRACKS,
      addTrack: (name, videoId) =>
        set((state) => ({
          tracks: [...state.tracks, { id: crypto.randomUUID(), name, videoId }],
        })),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
      moveTrack: (from, to) =>
        set((state) => ({ tracks: reorder(state.tracks, from, to) })),
      resetToDefaults: () => set({ tracks: DEFAULT_TRACKS }),
    }),
    { name: 'fumble-soundboard', version: 1 },
  ),
);
