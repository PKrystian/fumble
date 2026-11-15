import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, isSoundboardBackup, readSoundboardData } from './validation';
import { selectTracks, categoryNameError, trackName } from './catalog';
import { parseYouTubeSource, sourceUrl } from './youtube';
import { parseSoundboardFile, soundboardBackup } from './files';
import { translate } from '@/i18n/translate';

const track = { id: 'one', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'custom' };
const data = { tracks: [track], categories: [{ id: 'custom', name: null }] };
const backup = (state: unknown = data, version = 6) => ({ state, version });
describe('soundboard validation and migration', () => {
  it('rejects malformed, duplicated and orphaned entries without changing the input', () => {
    const invalid: unknown[] = [
      null,
      [],
      {},
      { tracks: [] },
      { ...data, tracks: null },
      { ...data, categories: [] },
      { ...data, tracks: [track, track] },
      { ...data, categories: [data.categories[0], data.categories[0]] },
      { ...data, tracks: [{ ...track, videoId: 'bad' }] },
      { ...data, tracks: [{ ...track, playlistId: 'bad' }] },
      { ...data, tracks: [{ ...track, category: 'missing' }] },
      { ...data, tracks: [{ ...track, name: '' }] },
      { ...data, tracks: [{ ...track, favorite: 'yes' }] },
      { ...data, tracks: [{ ...track, customName: 1 }] },
      { ...data, tracks: [{ ...track, createdAt: -1 }] },
      { ...data, categories: [{ id: 'custom', name: '' }] },
      { ...data, categories: [{ id: 'all', name: 'All' }] },
      {
        ...data,
        categories: [
          { id: 'other', name: null },
          { id: 'custom', name: null },
        ],
      },
      { ...data, injected: true },
    ];
    for (const value of invalid)
      expect(isSoundboardBackup(backup(value)), JSON.stringify(value)).toBe(false);
    for (const value of [
      null,
      [],
      {},
      { state: data },
      { state: data, version: '6' },
      backup(data, -1),
      backup(data, 7),
      backup(data, 0.5),
    ])
      expect(isSoundboardBackup(value)).toBe(false);
    expect(data.tracks).toEqual([track]);
  });
  it('preserves current metadata and playlist-only sources', () => {
    const value = {
      ...data,
      tracks: [
        { ...track, favorite: true, createdAt: 123, customName: true },
        { ...track, id: 'playlist', videoId: '', playlistId: 'PL1234567890' },
      ],
    };
    expect(readSoundboardData(value, 6)).toEqual(value);
    expect(isSoundboardBackup(backup(value))).toBe(true);
    expect(readSoundboardData({ tracks: [] }, 3).categories).toEqual(DEFAULT_CATEGORIES);
    expect(readSoundboardData({}, 0).tracks).toEqual([]);
  });
  it('migrates old categories without dropping user tracks', () => {
    expect(
      readSoundboardData(
        { tracks: [{ id: 'old', name: 'Old', videoId: track.videoId }] },
        2,
      ).tracks[0]?.category,
    ).toBe('custom');
    expect(
      readSoundboardData({ tracks: [{ ...track, category: 'old' }], categories: [] }, 4)
        .categories,
    ).toContainEqual({ id: 'old', name: 'old' });
    expect(
      readSoundboardData({ tracks: [], categories: [{ id: 'old', name: '' }] }, 5)
        .categories,
    ).toContainEqual({ id: 'old', name: 'old' });
    expect(() =>
      readSoundboardData({ ...data, tracks: [{ ...track, category: 'old' }] }, 5),
    ).toThrow();
  });
});
describe('YouTube inputs', () => {
  it('accepts supported YouTube routes and playlists while rejecting unrelated origins and malformed IDs', () => {
    for (const url of [
      'https://example.com/watch?v=jNQXAC9IVRw',
      'https://youtube.com.evil.test/watch?v=jNQXAC9IVRw',
      'https://user:secret@youtube.com/watch?v=jNQXAC9IVRw',
      'ftp://youtube.com/watch?v=jNQXAC9IVRw',
      'https://youtu.be/jNQXAC9IVRw/extra',
      'https://youtube.com/watch?v=jNQXAC9IVRwEXTRA',
      'https://youtube.com/watch?v=jNQXAC9IVRw&list=bad',
      'https://youtube.com',
      'bad',
    ])
      expect(parseYouTubeSource(url)).toBeNull();
    for (const url of [
      'https://music.youtube.com/watch?v=jNQXAC9IVRw',
      'https://m.youtube.com/live/jNQXAC9IVRw',
      'https://www.youtu.be/jNQXAC9IVRw',
    ])
      expect(parseYouTubeSource(url)).toEqual({ videoId: track.videoId });
    const playlist = { videoId: '', playlistId: 'PL1234567890' };
    expect(parseYouTubeSource(sourceUrl(playlist))).toEqual(playlist);
    expect(
      parseYouTubeSource('https://youtube.com/embed/videoseries?list=PL1234567890'),
    ).toEqual(playlist);
    expect(
      parseYouTubeSource('https://youtube.com/watch?v=jNQXAC9IVRw&list=PL1234567890'),
    ).toEqual({ ...playlist, videoId: track.videoId });
    expect(sourceUrl(track)).toContain('watch?v=jNQXAC9IVRw');
  });
});
describe('catalog behavior', () => {
  const t = (key: string) => translate('pl', key);
  it('searches original and localized names, normalizes Polish and sorts stably', () => {
    const a = {
      id: 'bardify-ewceCUF4qtU',
      name: 'Floating Peace',
      videoId: track.videoId,
      category: 'custom',
    };
    const b = { ...track, id: 'two', name: 'Łąka', favorite: true, createdAt: 1 };
    const options = {
      query: ' laka ',
      category: 'all',
      favorites: false,
      sort: 'manual' as const,
      locale: 'pl' as const,
      t,
    };
    expect(selectTracks([a, b], options)).toEqual([b]);
    expect(selectTracks([a, b], { ...options, query: 'floating' })).toEqual([a]);
    expect(selectTracks([a, b], { ...options, query: '', favorites: true })).toEqual([b]);
    expect(selectTracks([a, b], { ...options, query: '', category: 'missing' })).toEqual(
      [],
    );
    expect(selectTracks([a, b], { ...options, query: '', sort: 'recent' })[0]).toEqual(b);
    expect(selectTracks([b, a], { ...options, query: '', sort: 'name' })).toHaveLength(2);
    expect(selectTracks([b, a], { ...options, query: '', sort: 'recent' })[0]).toEqual(b);
    expect(
      selectTracks([a, { ...b, createdAt: 0 }], {
        ...options,
        query: '',
        sort: 'recent',
      })[0]?.id,
    ).toBe('two');
    expect(trackName({ ...a, customName: true }, 'pl', t)).toBe('Floating Peace');
    expect(trackName({ ...a, id: 'bardify-playlist-places' }, 'pl', t)).toBe(
      'Ważne miejsca',
    );
    expect(trackName({ ...a, id: 'unknown' }, 'pl', t)).toBe(a.name);
    expect(trackName({ ...a, id: '__proto__' }, 'pl', t)).toBe(a.name);
    expect(trackName({ ...a, id: 'bardify-playlist-constructor' }, 'pl', t)).toBe(a.name);
    expect(trackName(a, 'en', t)).toBe(a.name);
    expect(categoryNameError(' ', data.categories, t)).toBe(
      'soundboard.categoryRequired',
    );
    expect(categoryNameError('Moje utwory', data.categories, t)).toBe(
      'soundboard.categoryDuplicate',
    );
    expect(categoryNameError('Moje utwory', data.categories, t, 'custom')).toBeNull();
  });
});
describe('scoped backup files', () => {
  it('roundtrips favorites, timestamps, categories and ordering without including other collections', () => {
    const current = { ...data, tracks: [{ ...track, favorite: true, createdAt: 1 }] };
    const file = soundboardBackup(current);
    expect(file.app).toBe('fumble-soundboard');
    expect(parseSoundboardFile(JSON.stringify(file)).data).toEqual(current);
    const full = {
      app: 'fumble',
      version: 1,
      exportedAt: file.exportedAt,
      data: { 'fumble-soundboard': JSON.stringify(file.soundboard) },
    };
    expect(parseSoundboardFile(JSON.stringify(full)).data).toEqual(current);
  });
  it('rejects invalid, oversized, incomplete and future backups', () => {
    const valid = soundboardBackup(data);
    for (const value of [
      null,
      [],
      {},
      { ...valid, app: 'other' },
      { ...valid, version: 2 },
      { ...valid, exportedAt: 'yesterday' },
      { ...valid, soundboard: null },
      { ...valid, soundboard: {} },
      { ...valid, soundboard: { version: 99, state: data } },
      { app: 'fumble', version: 1, exportedAt: valid.exportedAt, data: {} },
    ])
      expect(() => parseSoundboardFile(JSON.stringify(value))).toThrow();
    expect(() => parseSoundboardFile('x'.repeat(10 * 1024 * 1024 + 1))).toThrow(
      'backup-too-large',
    );
  });
});
