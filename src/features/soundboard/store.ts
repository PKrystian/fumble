import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bardifyVideos from '@/data/generated/bardify.json';
import { followStoredChanges } from '@/features/storage/safeStorage';
import {
  getSoundboardSaveStatus,
  SOUNDBOARD_KEY,
  soundboardStorage,
} from './persistence';
import {
  DEFAULT_CATEGORIES,
  readSoundboardData,
  SOUNDBOARD_VERSION,
  type SoundboardData,
  type Track,
} from './validation';
import type { YouTubeSource } from './youtube';

export { DEFAULT_CATEGORIES } from './validation';
export type { SoundboardCategory, Track } from './validation';

export const DEFAULT_TRACKS: Track[] = [
  ...(bardifyVideos as Track[]),
  {
    id: 'bardify-playlist-places',
    name: 'Noteworthy Places',
    videoId: 'tpi5qsXm_cM',
    playlistId: 'PLPkQh2SAuabGrIpj-fbqJfIIbVc7gP1fi',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-planes',
    name: 'Through the Planes of Existence',
    videoId: 'FGs_8W839kI',
    playlistId: 'PLPkQh2SAuabF_DFumBg08o6FgcBIpqL4V',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-situations',
    name: 'Events & Situations',
    videoId: 'Jikm8CCRbdM',
    playlistId: 'PLPkQh2SAuabGmKCuoEptEq_sUSJsX47LT',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-settlements',
    name: 'Cities & Villages',
    videoId: 'ddMSMwKQkKI',
    playlistId: 'PLPkQh2SAuabE1-0NnCEwoQVnk_B-Cs5C6',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-ambience',
    name: 'Ambience',
    videoId: 'F8bYaMoQ2sM',
    playlistId: 'PLPkQh2SAuabEc-mGbjstiDcvGWDkxIFRZ',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-travel',
    name: 'Travel Pace',
    videoId: 'fv_7EurNAss',
    playlistId: 'PLPkQh2SAuabF3v05tmrK-hIKwDDjmcHVl',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-dungeons',
    name: 'Dungeons & Crypts',
    videoId: '205meIww0zg',
    playlistId: 'PLPkQh2SAuabEhQhgoDdOfimLSsud2Dz2L',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-tavern',
    name: 'You Meet In A Tavern',
    videoId: 'JyyQlYRqvRs',
    playlistId: 'PLPkQh2SAuabEi2pGCrbE14Zl-x8yW2EgJ',
    category: 'playlists',
  },
  {
    id: 'bardify-playlist-combat',
    name: 'Roll For Initiative!',
    videoId: '8Q7cioftmKs',
    playlistId: 'PLPkQh2SAuabExfT0ufQXMtSIIAFvRM5vH',
    category: 'playlists',
  },
];

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length)
    return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

interface SoundboardState extends SoundboardData {
  addTrack: (
    name: string,
    videoId: string,
    category: string,
    playlistId?: string,
  ) => string;
  updateTrack: (
    id: string,
    name: string,
    source: YouTubeSource,
    category: string,
    customName?: boolean,
  ) => void;
  toggleFavorite: (id: string) => void;
  removeTrack: (id: string) => void;
  moveTrack: (from: number, to: number) => void;
  setTrackCategory: (trackId: string, categoryId: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  replaceData: (data: SoundboardData) => void;
  resetEmpty: () => void;
  resetToExamples: () => void;
}

export const useSoundboardStore = create<SoundboardState>()(
  persist(
    (set) => ({
      tracks: DEFAULT_TRACKS,
      categories: DEFAULT_CATEGORIES,
      addTrack: (name, videoId, category, playlistId) => {
        const id = crypto.randomUUID();
        set((state) => ({
          tracks: [
            ...state.tracks,
            {
              id,
              name,
              videoId,
              category,
              createdAt: Date.now(),
              ...(playlistId ? { playlistId } : {}),
            },
          ],
        }));
        return id;
      },
      updateTrack: (id, name, source, category, customName = true) =>
        set((state) => ({
          tracks: state.tracks.map((track) => {
            if (track.id !== id) return track;
            const updated = { ...track, ...source, name, category, customName };
            if (!source.playlistId) delete updated.playlistId;
            return updated;
          }),
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id ? { ...track, favorite: !track.favorite } : track,
          ),
        })),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((track) => track.id !== id) })),
      moveTrack: (from, to) =>
        set((state) => ({ tracks: reorder(state.tracks, from, to) })),
      setTrackCategory: (id, category) =>
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === id ? { ...track, category } : track,
          ),
        })),
      addCategory: (name) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { id: `category-${crypto.randomUUID()}`, name: name.trim() },
          ],
        })),
      renameCategory: (id, name) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, name: name.trim() } : category,
          ),
        })),
      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          tracks: state.tracks.map((track) =>
            track.category === id ? { ...track, category: 'custom' } : track,
          ),
        })),
      replaceData: (data) => set(data),
      resetEmpty: () => set({ tracks: [], categories: [{ id: 'custom', name: null }] }),
      resetToExamples: () =>
        set({ tracks: [...DEFAULT_TRACKS], categories: [...DEFAULT_CATEGORIES] }),
    }),
    {
      name: 'fumble-soundboard',
      version: SOUNDBOARD_VERSION,
      storage: soundboardStorage,
      partialize: ({ tracks, categories }) => ({ tracks, categories }),
      migrate: (persisted, version) => readSoundboardData(persisted, version),
      merge: (persisted, current) =>
        persisted === undefined
          ? current
          : { ...current, ...readSoundboardData(persisted, SOUNDBOARD_VERSION) },
    },
  ),
);

followStoredChanges(SOUNDBOARD_KEY, () => {
  const status = getSoundboardSaveStatus();
  if (status.saved && !status.blocked) void useSoundboardStore.persist.rehydrate();
});
