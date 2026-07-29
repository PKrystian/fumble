import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ZONES, useLayoutStore } from './layoutStore';

describe('character layout store', () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.setState({ zones: DEFAULT_ZONES });
  });

  it('moves panels between zones and resets the layout', () => {
    useLayoutStore.getState().movePanel('skills', 'center', 1);
    expect(useLayoutStore.getState().zones.center).toEqual([
      'combat',
      'skills',
      'hitPoints',
      'tabs',
    ]);
    expect(useLayoutStore.getState().zones.right).not.toContain('skills');

    useLayoutStore.getState().reset();
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
  });

  it('merges newly introduced panels into a persisted layout', async () => {
    localStorage.setItem(
      'fumble-sheet-layout',
      JSON.stringify({
        state: {
          zones: {
            left: ['abilities'],
            center: ['combat'],
            right: ['skills'],
          },
        },
        version: 1,
      }),
    );
    await useLayoutStore.persist.rehydrate();

    expect(useLayoutStore.getState().zones).toEqual({
      left: ['abilities', 'savingThrows', 'passives'],
      center: ['combat', 'hitPoints', 'tabs'],
      right: ['skills', 'proficiencies', 'tracking', 'spellcasting', 'sessionLog'],
    });
  });

  it('keeps the current layout when persisted zones are absent', async () => {
    localStorage.setItem(
      'fumble-sheet-layout',
      JSON.stringify({ state: {}, version: 1 }),
    );
    await useLayoutStore.persist.rehydrate();
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
  });

  it('fills a missing persisted zone', async () => {
    localStorage.setItem(
      'fumble-sheet-layout',
      JSON.stringify({
        state: { zones: { left: [], center: [], right: undefined } },
        version: 1,
      }),
    );
    await useLayoutStore.persist.rehydrate();
    expect(useLayoutStore.getState().zones.right).toEqual(DEFAULT_ZONES.right);
  });

  it('keeps a complete persisted layout unchanged', async () => {
    localStorage.setItem(
      'fumble-sheet-layout',
      JSON.stringify({ state: { zones: DEFAULT_ZONES }, version: 1 }),
    );
    await useLayoutStore.persist.rehydrate();
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
  });
});
