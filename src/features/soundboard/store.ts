import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import bardifyVideos from '@/data/generated/bardify.json';

export interface Track {
  id: string;
  name: string;
  videoId: string;
  playlistId?: string;
  category: string;
}

export interface SoundboardCategory {
  id: string;
  name: string | null;
}

const CATEGORY_IDS = [
  'places',
  'planes',
  'situations',
  'settlements',
  'ambience',
  'travel',
  'dungeons',
  'tavern',
  'combat',
  'playlists',
  'custom',
] as const;

export const DEFAULT_CATEGORIES: SoundboardCategory[] = CATEGORY_IDS.map((id) => ({
  id,
  name: null,
}));

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

const customCategory = (): SoundboardCategory => ({ id: 'custom', name: null });

function categoriesForTracks(tracks: Track[]): SoundboardCategory[] {
  const known = new Set(DEFAULT_CATEGORIES.map((category) => category.id));
  const extra = [...new Set(tracks.map((track) => track.category))]
    .filter((id) => !known.has(id))
    .map((id) => ({ id, name: id }));
  return [...DEFAULT_CATEGORIES, ...extra];
}

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
  categories: SoundboardCategory[];
  addTrack: (name: string, videoId: string, category: string) => void;
  removeTrack: (id: string) => void;
  moveTrack: (from: number, to: number) => void;
  setTrackCategory: (trackId: string, categoryId: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  resetEmpty: () => void;
  resetToExamples: () => void;
}

export const useSoundboardStore = create<SoundboardState>()(
  persist(
    (set) => ({
      tracks: DEFAULT_TRACKS,
      categories: DEFAULT_CATEGORIES,
      addTrack: (name, videoId, category) =>
        set((state) => ({
          tracks: [...state.tracks, { id: crypto.randomUUID(), name, videoId, category }],
        })),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((track) => track.id !== id) })),
      moveTrack: (from, to) =>
        set((state) => ({ tracks: reorder(state.tracks, from, to) })),
      setTrackCategory: (trackId, categoryId) =>
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, category: categoryId } : track,
          ),
        })),
      addCategory: (name) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { id: `category-${crypto.randomUUID()}`, name },
          ],
        })),
      renameCategory: (id, name) =>
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, name } : category,
          ),
        })),
      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          tracks: state.tracks.map((track) =>
            track.category === id ? { ...track, category: 'custom' } : track,
          ),
        })),
      resetEmpty: () => set({ tracks: [], categories: [customCategory()] }),
      resetToExamples: () =>
        set({ tracks: [...DEFAULT_TRACKS], categories: [...DEFAULT_CATEGORIES] }),
    }),
    {
      name: 'fumble-soundboard',
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SoundboardState>;
        const storedTracks = state.tracks ?? [];
        const tracks =
          version < 3
            ? [
                ...DEFAULT_TRACKS,
                ...storedTracks
                  .filter(
                    (track) =>
                      !track.id.startsWith('default-') &&
                      !track.id.startsWith('bardify-'),
                  )
                  .map((track) => ({ ...track, category: track.category ?? 'custom' })),
              ]
            : storedTracks.map((track) => ({
                ...track,
                category: track.category ?? 'custom',
              }));
        return {
          ...state,
          tracks,
          categories:
            version < 4 || !state.categories
              ? categoriesForTracks(tracks)
              : state.categories,
        } as SoundboardState;
      },
    },
  ),
);
