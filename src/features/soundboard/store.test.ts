import { beforeEach, describe, expect, it } from 'vitest';
import { allowSoundboardReplacement } from './persistence';
import { DEFAULT_CATEGORIES, reorder, useSoundboardStore, type Track } from './store';
import { SOUNDBOARD_VERSION } from './validation';

const custom: Track = {
  id: 'custom-track',
  name: 'Rain',
  videoId: 'jNQXAC9IVRw',
  category: 'custom',
};

describe('soundboard store', () => {
  beforeEach(() => {
    localStorage.clear();
    useSoundboardStore.setState({ tracks: [], categories: [...DEFAULT_CATEGORIES] });
  });

  it('follows changes from another tab while the library is saved', () => {
    const other = JSON.stringify({
      state: { tracks: [custom], categories: [...DEFAULT_CATEGORIES] },
      version: SOUNDBOARD_VERSION,
    });
    localStorage.setItem('fumble-soundboard', other);
    window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-soundboard' }));
    expect(useSoundboardStore.getState().tracks).toEqual([custom]);

    localStorage.setItem('fumble-soundboard', '{broken');
    window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-soundboard' }));
    localStorage.setItem('fumble-soundboard', other.replace('Rain', 'Storm'));
    window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-soundboard' }));
    expect(useSoundboardStore.getState().tracks).toEqual([custom]);
    allowSoundboardReplacement();
  });

  it('reorders lists and rejects invalid moves', () => {
    const list = ['a', 'b', 'c'];
    expect(reorder(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorder(list, 1, 1)).toBe(list);
    expect(reorder(list, -1, 1)).toBe(list);
    expect(reorder(list, 1, 3)).toBe(list);
  });

  it('adds, moves, removes and resets tracks', () => {
    useSoundboardStore.getState().addTrack('Rain', 'jNQXAC9IVRw', 'custom');
    expect(useSoundboardStore.getState().tracks[0]).toMatchObject({
      name: 'Rain',
      videoId: 'jNQXAC9IVRw',
      category: 'custom',
    });

    useSoundboardStore.getState().addTrack('Fire', 'ewceCUF4qtU', 'combat');
    useSoundboardStore.getState().moveTrack(0, 1);
    expect(useSoundboardStore.getState().tracks.map((track) => track.name)).toEqual([
      'Fire',
      'Rain',
    ]);
    useSoundboardStore
      .getState()
      .removeTrack(useSoundboardStore.getState().tracks[0]!.id);
    expect(useSoundboardStore.getState().tracks).toHaveLength(1);

    useSoundboardStore.getState().resetToExamples();
    expect(useSoundboardStore.getState().tracks.length).toBeGreaterThan(1);
    expect(
      useSoundboardStore.getState().tracks.some((track) => track.id === 'custom-track'),
    ).toBe(false);
  });

  it('adds, renames and removes categories while preserving their tracks', () => {
    useSoundboardStore.getState().addCategory('Boss fights');
    const category = useSoundboardStore
      .getState()
      .categories.find((item) => item.name === 'Boss fights')!;
    useSoundboardStore.getState().renameCategory(category.id, 'Final battles');
    useSoundboardStore.getState().addTrack('Dragon', 'jNQXAC9IVRw', category.id);
    expect(useSoundboardStore.getState().tracks[0]!.category).toBe(category.id);
    useSoundboardStore.getState().addTrack('Other', 'jNQXAC9IVRw', 'custom');

    useSoundboardStore.getState().removeCategory(category.id);
    expect(useSoundboardStore.getState().tracks[0]!.category).toBe('custom');
    expect(
      useSoundboardStore.getState().categories.some((item) => item.id === category.id),
    ).toBe(false);
  });

  it('changes track categories and clears the soundboard', () => {
    useSoundboardStore.getState().addTrack('Rain', 'jNQXAC9IVRw', 'ambience');
    useSoundboardStore.getState().addTrack('Fire', 'ewceCUF4qtU', 'combat');
    const id = useSoundboardStore.getState().tracks[0]!.id;
    useSoundboardStore.getState().setTrackCategory(id, 'travel');
    expect(useSoundboardStore.getState().tracks[0]!.category).toBe('travel');
    useSoundboardStore.getState().setTrackCategory('missing', 'travel');

    useSoundboardStore.getState().resetEmpty();
    expect(useSoundboardStore.getState().tracks).toEqual([]);
    expect(useSoundboardStore.getState().categories).toEqual([
      { id: 'custom', name: null },
    ]);
  });

  it('edits playlist sources without dropping favorites and removes stale playlist IDs for videos', () => {
    useSoundboardStore.setState({
      tracks: [{ ...custom, playlistId: 'PL1234567890', favorite: true }],
    });
    useSoundboardStore
      .getState()
      .updateTrack(
        custom.id,
        'Playlist',
        { videoId: '', playlistId: 'PL0987654321' },
        'combat',
      );
    expect(useSoundboardStore.getState().tracks[0]).toMatchObject({
      name: 'Playlist',
      favorite: true,
      customName: true,
      playlistId: 'PL0987654321',
    });
    useSoundboardStore
      .getState()
      .updateTrack(custom.id, 'Video', { videoId: 'ewceCUF4qtU' }, 'custom');
    expect(useSoundboardStore.getState().tracks[0]).not.toHaveProperty('playlistId');
    expect(useSoundboardStore.getState().tracks[0]?.favorite).toBe(true);
  });

  it('migrates legacy tracks without replacing examples or changing their order', async () => {
    localStorage.setItem(
      'fumble-soundboard',
      JSON.stringify({
        state: {
          tracks: [
            { ...custom, category: undefined },
            {
              id: 'default-old',
              name: 'Old default',
              videoId: 'ewceCUF4qtU',
              category: 'places',
            },
          ],
        },
        version: 2,
      }),
    );
    await useSoundboardStore.persist.rehydrate();

    const tracks = useSoundboardStore.getState().tracks;
    expect(tracks.find((track) => track.id === custom.id)).toMatchObject({
      category: 'custom',
    });
    expect(tracks.map((track) => track.id)).toEqual([custom.id, 'default-old']);
    expect(tracks[1]?.name).toBe('Old default');
  });

  it('creates categories for legacy tracks with custom category ids', async () => {
    localStorage.setItem(
      'fumble-soundboard',
      JSON.stringify({
        state: {
          tracks: [{ ...custom, id: 'legacy', category: 'new-category' }],
        },
        version: 2,
      }),
    );
    await useSoundboardStore.persist.rehydrate();
    expect(useSoundboardStore.getState().categories).toContainEqual({
      id: 'new-category',
      name: 'new-category',
    });
  });

  it('fills a missing category in current persisted data', async () => {
    localStorage.setItem(
      'fumble-soundboard',
      JSON.stringify({
        state: { tracks: [{ ...custom, category: undefined }] },
        version: 4,
      }),
    );
    await useSoundboardStore.persist.rehydrate();
    expect(useSoundboardStore.getState().tracks).toEqual([custom]);
    expect(useSoundboardStore.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('migrates current persisted data without tracks', async () => {
    localStorage.setItem('fumble-soundboard', JSON.stringify({ state: {}, version: 4 }));
    await useSoundboardStore.persist.rehydrate();
    expect(useSoundboardStore.getState().tracks).toEqual([]);
    expect(useSoundboardStore.getState().categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('keeps persisted categories when the current version provides them', async () => {
    const categories = [{ id: 'saved', name: 'Saved' }];
    localStorage.setItem(
      'fumble-soundboard',
      JSON.stringify({ state: { tracks: [], categories }, version: 4 }),
    );
    await useSoundboardStore.persist.rehydrate();
    expect(useSoundboardStore.getState().categories).toEqual([
      ...categories,
      { id: 'custom', name: null },
    ]);
  });
});
