import { beforeEach, describe, expect, it } from 'vitest';
import { reorder, useSoundboardStore, type Track } from './store';

const custom: Track = {
  id: 'custom-track',
  name: 'Rain',
  videoId: 'rain-id',
  category: 'custom',
};

describe('soundboard store', () => {
  beforeEach(() => {
    localStorage.clear();
    useSoundboardStore.setState({ tracks: [] });
  });

  it('reorders lists and rejects invalid moves', () => {
    const list = ['a', 'b', 'c'];
    expect(reorder(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorder(list, 1, 1)).toBe(list);
    expect(reorder(list, -1, 1)).toBe(list);
    expect(reorder(list, 1, 3)).toBe(list);
  });

  it('adds, moves, removes and resets tracks', () => {
    useSoundboardStore.getState().addTrack('Rain', 'rain-id');
    expect(useSoundboardStore.getState().tracks[0]).toMatchObject({
      name: 'Rain',
      videoId: 'rain-id',
      category: 'custom',
    });

    useSoundboardStore.getState().addTrack('Fire', 'fire-id');
    useSoundboardStore.getState().moveTrack(0, 1);
    expect(useSoundboardStore.getState().tracks.map((track) => track.name)).toEqual([
      'Fire',
      'Rain',
    ]);
    useSoundboardStore
      .getState()
      .removeTrack(useSoundboardStore.getState().tracks[0]!.id);
    expect(useSoundboardStore.getState().tracks).toHaveLength(1);

    useSoundboardStore.getState().resetToDefaults();
    expect(useSoundboardStore.getState().tracks.length).toBeGreaterThan(1);
    expect(
      useSoundboardStore.getState().tracks.some((track) => track.id === 'custom-track'),
    ).toBe(false);
  });

  it('migrates legacy custom tracks while replacing old defaults', async () => {
    localStorage.setItem(
      'fumble-soundboard',
      JSON.stringify({
        state: {
          tracks: [
            { ...custom, category: undefined },
            {
              id: 'default-old',
              name: 'Old default',
              videoId: 'old',
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
    expect(tracks.some((track) => track.id === 'default-old')).toBe(false);
    expect(tracks.some((track) => track.id.startsWith('bardify-'))).toBe(true);
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
  });

  it('migrates current persisted data without tracks', async () => {
    localStorage.setItem('fumble-soundboard', JSON.stringify({ state: {}, version: 4 }));
    await useSoundboardStore.persist.rehydrate();
    expect(useSoundboardStore.getState().tracks).toEqual([]);
  });
});
