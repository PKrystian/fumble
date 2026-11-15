import { isPlaylistId, isVideoId } from './youtube';

export interface Track {
  id: string;
  name: string;
  videoId: string;
  playlistId?: string;
  category: string;
  favorite?: boolean;
  createdAt?: number;
  customName?: boolean;
}

export interface SoundboardCategory {
  id: string;
  name: string | null;
}

export interface SoundboardData {
  tracks: Track[];
  categories: SoundboardCategory[];
}

export const SOUNDBOARD_VERSION = 6;
export const CATEGORY_IDS = [
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
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const optionalBoolean = (value: unknown) =>
  value === undefined || typeof value === 'boolean';
const unique = (items: { id: string }[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

export function readSoundboardData(value: unknown, version: number): SoundboardData {
  if (
    !record(value) ||
    !Number.isInteger(version) ||
    version < 0 ||
    version > SOUNDBOARD_VERSION ||
    Object.keys(value).some((key) => !['tracks', 'categories'].includes(key))
  )
    throw new Error('backup-invalid-data');
  const tracks = value.tracks ?? (version < 5 ? [] : null);
  if (
    !Array.isArray(tracks) ||
    !tracks.every(
      (track) =>
        record(track) &&
        text(track.id) &&
        text(track.name) &&
        (isVideoId(track.videoId) ||
          (track.videoId === '' && isPlaylistId(track.playlistId))) &&
        (track.playlistId === undefined || isPlaylistId(track.playlistId)) &&
        (text(track.category) || (version < 5 && track.category === undefined)) &&
        optionalBoolean(track.favorite) &&
        optionalBoolean(track.customName) &&
        (track.createdAt === undefined ||
          (typeof track.createdAt === 'number' &&
            Number.isFinite(track.createdAt) &&
            track.createdAt >= 0)),
    ) ||
    !unique(tracks)
  )
    throw new Error('backup-invalid-data');
  const normalizedTracks = (tracks as Track[]).map((track) => ({
    ...track,
    category: track.category ?? 'custom',
  }));
  const rawCategories = value.categories ?? (version < 5 ? DEFAULT_CATEGORIES : null);
  if (
    !Array.isArray(rawCategories) ||
    !rawCategories.every(
      (category) =>
        record(category) &&
        text(category.id) &&
        category.id !== 'all' &&
        (text(category.name) ||
          (category.name === null &&
            (version < 6 || CATEGORY_IDS.some((id) => id === category.id))) ||
          (version < 6 && category.name === '')),
    ) ||
    !unique(rawCategories)
  )
    throw new Error('backup-invalid-data');
  const categories = (rawCategories as SoundboardCategory[]).map((category) => ({
    ...category,
    name:
      category.name?.trim() ||
      (CATEGORY_IDS.some((id) => id === category.id) ? null : category.id),
  }));
  if (version < 6) {
    if (!categories.some((category) => category.id === 'custom'))
      categories.push({ id: 'custom', name: null });
    for (const track of normalizedTracks)
      if (!categories.some((category) => category.id === track.category)) {
        if (version >= 5) throw new Error('backup-invalid-data');
        categories.push({ id: track.category, name: track.category });
      }
  }
  if (
    !categories.some((category) => category.id === 'custom') ||
    normalizedTracks.some(
      (track) => !categories.some((category) => category.id === track.category),
    ) ||
    categories.some(
      (category) =>
        category.name === null && !CATEGORY_IDS.some((id) => id === category.id),
    )
  )
    throw new Error('backup-invalid-data');
  return { tracks: normalizedTracks, categories };
}

export function isSoundboardBackup(value: unknown): boolean {
  if (!record(value) || !record(value.state) || typeof value.version !== 'number')
    return false;
  try {
    readSoundboardData(value.state, value.version);
    return true;
  } catch {
    return false;
  }
}
