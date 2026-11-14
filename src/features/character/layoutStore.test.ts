import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLAPSED,
  DEFAULT_MOBILE_ORDER,
  DEFAULT_ZONES,
  findPanelZone,
  layoutSnapshot,
  readLayout,
  useLayoutStore,
} from './layoutStore';

describe('character layout store', () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().reset();
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

  it('moves panels by one position within columns and the mobile order', () => {
    const store = useLayoutStore.getState();
    store.movePanelBy('hitPoints', -1);
    expect(useLayoutStore.getState().zones.center).toEqual([
      'hitPoints',
      'combat',
      'tabs',
    ]);
    store.movePanelBy('hitPoints', -1);
    store.movePanelBy('unknown', 1);
    expect(useLayoutStore.getState().zones.center[0]).toBe('hitPoints');
    store.moveMobile('combat', -1);
    expect(useLayoutStore.getState().mobileOrder.slice(0, 2)).toEqual([
      'combat',
      'hitPoints',
    ]);
    store.moveMobile('combat', -1);
    store.moveMobile('sessionLog', 1);
    store.moveMobile('unknown', 1);
    expect(useLayoutStore.getState().mobileOrder.at(-1)).toBe('sessionLog');
    store.movePanel('skills', 'left', 99);
    expect(useLayoutStore.getState().zones.left.at(-1)).toBe('skills');
    expect(findPanelZone(useLayoutStore.getState().zones, 'skills')).toBe('left');
    expect(findPanelZone(useLayoutStore.getState().zones, 'unknown')).toBeUndefined();
  });

  it('toggles collapsed panels and applies layouts from files', () => {
    const store = useLayoutStore.getState();
    store.toggleCollapsed('hitPoints');
    expect(useLayoutStore.getState().collapsed).toContain('hitPoints');
    store.toggleCollapsed('hitPoints');
    expect(useLayoutStore.getState().collapsed).not.toContain('hitPoints');
    expect(store.applyLayout(null)).toBe(false);
    expect(store.applyLayout({ zones: [] })).toBe(false);
    expect(
      store.applyLayout({
        zones: { left: ['tabs', 'tabs', 'unknown'], center: 'x', right: [3] },
        mobileOrder: ['tabs', 'unknown'],
        collapsed: ['tabs', 'unknown'],
      }),
    ).toBe(true);
    const layout = layoutSnapshot();
    expect(layout.zones.left[0]).toBe('tabs');
    expect(layout.zones.center).toEqual(['combat', 'hitPoints']);
    expect(layout.mobileOrder[0]).toBe('tabs');
    expect(layout.mobileOrder).toHaveLength(DEFAULT_MOBILE_ORDER.length);
    expect(layout.collapsed).toEqual(['tabs']);
    expect(readLayout({ zones: {} })?.collapsed).toEqual(DEFAULT_COLLAPSED);
  });

  it('persists the mobile order and collapsed panels', async () => {
    useLayoutStore.getState().toggleCollapsed('combat');
    const saved = JSON.parse(localStorage.getItem('fumble-sheet-layout')!);
    expect(saved.version).toBe(2);
    expect(Object.keys(saved.state)).toEqual(['zones', 'mobileOrder', 'collapsed']);
    localStorage.setItem(
      'fumble-sheet-layout',
      JSON.stringify({ state: null, version: 2 }),
    );
    await useLayoutStore.persist.rehydrate();
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
  });
});
