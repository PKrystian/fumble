import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_SYNC, createCharacter, type Character } from './model';
import {
  buildSyncPatch,
  markManual,
  restoreSyncedField,
  syncSignature,
  useSheetSync,
} from './sync';

const mocks = vi.hoisted(() => ({
  ready: true,
  spellsReady: true,
  sync: vi.fn(),
}));

vi.mock('./compendiumSync', () => ({
  useClassEntryPair: (value: string) => ({
    localized: value ? { name: 'Barbarian' } : undefined,
    english: value ? { name: 'Barbarian' } : undefined,
    ready: mocks.ready,
  }),
  useSpeciesEntryPair: () => ({ localized: undefined, english: undefined, ready: true }),
  useBackgroundEntryPair: () => ({
    localized: undefined,
    english: undefined,
    ready: true,
  }),
  useSpellIndex: () => ({ index: new Map(), ready: mocks.spellsReady }),
  findSubclassPair: () => ({ localized: undefined, english: undefined }),
  syncClassFeatures: (...args: unknown[]) => mocks.sync(...args),
}));

const computed: Partial<Character> = {
  features: [
    { id: 'auto-feature-0', name: 'Rage', source: 'Barbarian 1', notes: '', auto: true },
  ],
  spells: [],
  speed: { walk: 25, swim: 0, climb: 0, fly: 0 },
  savingThrowProficiencies: ['str', 'con'],
  toolProficiencies: 'Smith',
  hitDice: '1d12',
};

function hero(changes: Partial<Character> = {}): Character {
  return { ...createCharacter('Hero'), className: 'barbarian', ...changes };
}

describe('class synchronization', () => {
  beforeEach(() => {
    mocks.ready = true;
    mocks.spellsReady = true;
    mocks.sync.mockReset();
    mocks.sync.mockReturnValue(computed);
  });

  it('applies mechanics only after a selection changes', () => {
    const fresh = hero();
    expect(buildSyncPatch(fresh, computed)).toEqual({
      ...computed,
      syncSignature: syncSignature(fresh),
    });

    const settled = hero({ syncSignature: syncSignature(hero()) });
    expect(buildSyncPatch(settled, computed)).toEqual({
      features: computed.features,
      spells: [],
    });

    const legacy = hero({ syncSignature: LEGACY_SYNC });
    expect(buildSyncPatch(legacy, computed)).toEqual({
      features: computed.features,
      spells: [],
      syncSignature: syncSignature(legacy),
    });
  });

  it('keeps manual fields until forced or restored', () => {
    const manual = hero({ manualFields: ['speed', 'savingThrows'] });
    const patch = buildSyncPatch(manual, computed);
    expect(patch).not.toHaveProperty('speed');
    expect(patch).not.toHaveProperty('savingThrowProficiencies');
    expect(patch.toolProficiencies).toBe('Smith');

    const settled = { ...manual, syncSignature: syncSignature(manual) };
    expect(buildSyncPatch(settled, computed, true)).toMatchObject({
      speed: computed.speed,
      manualFields: [],
    });
    expect(buildSyncPatch(settled, {}, false)).toEqual({});

    expect(restoreSyncedField(manual, computed, 'speed')).toEqual({
      speed: computed.speed,
      manualFields: ['savingThrows'],
    });
    expect(restoreSyncedField(manual, {}, 'speed')).toEqual({
      manualFields: ['savingThrows'],
    });
  });

  it('marks manual edits only for synchronized values', () => {
    const character = hero();
    expect(markManual(character, 'speed', computed)).toEqual({ manualFields: ['speed'] });
    expect(markManual(character, 'speed', null)).toEqual({});
    expect(markManual(character, 'weaponProficiencies', computed)).toEqual({});
    expect(
      markManual({ ...character, autoSyncFeatures: false }, 'speed', computed),
    ).toEqual({});
    expect(
      markManual({ ...character, manualFields: ['speed'] }, 'speed', computed),
    ).toEqual({});
  });

  it('synchronizes once data is ready and skips disabled characters', async () => {
    const update = vi.fn();
    const character = hero();
    const { result, rerender } = renderHook(
      ({ value }: { value: Character | undefined }) => useSheetSync(value, update),
      { initialProps: { value: character as Character | undefined } },
    );
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(result.current).toEqual({ computed, ready: true });

    update.mockClear();
    rerender({ value: { ...character, autoSyncFeatures: false } });
    expect(update).not.toHaveBeenCalled();
    rerender({ value: undefined });
    expect(result.current).toEqual({ computed: null, ready: false });
  });

  it('waits for compendium data', () => {
    mocks.spellsReady = false;
    const update = vi.fn();
    const { result } = renderHook(() => useSheetSync(hero(), update));
    expect(result.current.ready).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
