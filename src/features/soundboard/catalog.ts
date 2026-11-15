import plNames from '@/data/generated/pl/bardify.json';
import type { Locale } from '@/i18n/locales';
import type { SoundboardCategory, Track } from './validation';

const defaultNames = new Set([
  'places',
  'planes',
  'situations',
  'settlements',
  'ambience',
  'travel',
  'dungeons',
  'tavern',
  'combat',
]);
export function trackName(track: Track, locale: Locale, t: (key: string) => string) {
  if (track.customName) return track.name;
  const key = track.id.replace('bardify-playlist-', '');
  if (track.id.startsWith('bardify-playlist-') && defaultNames.has(key))
    return t(`soundboard.defaultTrack.${key}`);
  if (locale === 'pl' && Object.hasOwn(plNames, track.id))
    return (plNames as Record<string, string>)[track.id]!;
  return track.name;
}
export const categoryName = (category: SoundboardCategory, t: (key: string) => string) =>
  category.name ?? t(`soundboard.category.${category.id}`);
export const normalizeSoundboardText = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('ł', 'l');
export type TrackSort = 'manual' | 'name' | 'recent';
export function selectTracks(
  tracks: Track[],
  options: {
    query: string;
    category: string;
    favorites: boolean;
    sort: TrackSort;
    locale: Locale;
    t: (key: string) => string;
  },
) {
  const query = normalizeSoundboardText(options.query);
  const indexes = new Map(tracks.map((track, index) => [track.id, index]));
  const visible = tracks.filter(
    (track) =>
      (options.category === 'all' || track.category === options.category) &&
      (!options.favorites || track.favorite) &&
      normalizeSoundboardText(
        `${track.name} ${trackName(track, options.locale, options.t)}`,
      ).includes(query),
  );
  if (options.sort === 'name')
    visible.sort((a, b) =>
      trackName(a, options.locale, options.t).localeCompare(
        trackName(b, options.locale, options.t),
        options.locale,
      ),
    );
  if (options.sort === 'recent')
    visible.sort(
      (a, b) =>
        (b.createdAt ?? 0) - (a.createdAt ?? 0) ||
        indexes.get(b.id)! - indexes.get(a.id)!,
    );
  return visible;
}

export function categoryNameError(
  name: string,
  categories: SoundboardCategory[],
  t: (key: string) => string,
  except?: string,
) {
  const value = normalizeSoundboardText(name);
  if (!value) return 'soundboard.categoryRequired';
  return categories.some(
    (category) =>
      category.id !== except &&
      normalizeSoundboardText(categoryName(category, t)) === value,
  )
    ? 'soundboard.categoryDuplicate'
    : null;
}
