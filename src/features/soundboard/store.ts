import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bardifyVideos from '@/data/generated/bardify.json';

export interface Track {
  id: string;
  name: string;
  videoId: string;
  playlistId?: string;
  category: SoundboardCategory;
}

export type SoundboardCategory =
  | 'places'
  | 'planes'
  | 'situations'
  | 'settlements'
  | 'ambience'
  | 'travel'
  | 'dungeons'
  | 'tavern'
  | 'combat'
  | 'playlists'
  | 'custom';

const DEFAULT_TRACKS: Track[] = [
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
          tracks: [
            ...state.tracks,
            { id: crypto.randomUUID(), name, videoId, category: 'custom' },
          ],
        })),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
      moveTrack: (from, to) =>
        set((state) => ({ tracks: reorder(state.tracks, from, to) })),
      resetToDefaults: () => set({ tracks: DEFAULT_TRACKS }),
    }),
    {
      name: 'fumble-soundboard',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SoundboardState>;
        const tracks = state.tracks ?? [];
        if (version < 3) {
          const custom = tracks
            .filter(
              (track) =>
                !track.id.startsWith('default-') && !track.id.startsWith('bardify-'),
            )
            .map((track) => ({ ...track, category: track.category ?? 'custom' }));
          return { ...state, tracks: [...DEFAULT_TRACKS, ...custom] } as SoundboardState;
        }
        return {
          ...state,
          tracks: tracks.map((track) => ({
            ...track,
            category: track.category ?? 'custom',
          })),
        } as SoundboardState;
      },
    },
  ),
);
