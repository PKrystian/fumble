import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INITIATIVE_KEY,
  emptyInitiative,
  parseStoredInitiative,
  serializeInitiative,
  sortCombatants,
  type Combatant,
} from './model';
import { createInitiativeStore } from './store';

const row = (id: string, initiative: number | null, name = id): Combatant => ({
  id,
  name,
  initiative,
  ac: null,
  hpCurrent: 5,
  hpMax: 8,
  conditions: '',
  isPlayer: false,
});
const older = (combatants: Combatant[], round = 0, turnId: string | null = null) =>
  JSON.stringify({ state: { combatants, round, turnId }, version: 1 });

beforeEach(() => localStorage.removeItem(INITIATIVE_KEY));

describe('initiative turns', () => {
  it('orders by score, preserves tie order, and puts unknown scores last', () => {
    const entries = [
      row('z', 12),
      row('a', 12),
      row('x', null),
      row('c', 18),
      row('y', null),
      row('n', -3),
    ];
    expect(sortCombatants(entries).map(({ id }) => id)).toEqual([
      'c',
      'z',
      'a',
      'n',
      'x',
      'y',
    ]);
    expect(entries.map(({ id }) => id)).toEqual(['z', 'a', 'x', 'c', 'y', 'n']);
  });

  it('starts explicitly, stops at the first turn when going backwards, and crosses later round boundaries', () => {
    const store = createInitiativeStore();
    const { next, previous } = store.getState();
    next();
    previous();
    expect(localStorage.getItem(INITIATIVE_KEY)).toBeNull();
    store.setState({ combatants: [row('low', 5), row('high', 20)] });
    previous();
    expect(store.getState()).toMatchObject({ round: 0, turnId: null });
    next();
    previous();
    expect(store.getState()).toMatchObject({ round: 1, turnId: 'high' });
    next();
    expect(store.getState()).toMatchObject({ round: 1, turnId: 'low' });
    next();
    expect(store.getState()).toMatchObject({ round: 2, turnId: 'high' });
    previous();
    expect(store.getState()).toMatchObject({ round: 1, turnId: 'low' });
    previous();
    expect(store.getState()).toMatchObject({ round: 1, turnId: 'high' });
  });

  it('keeps the active turn on append and edit, allows only tie moves, and remembers the order', () => {
    const store = createInitiativeStore();
    const { addCombatant, addCombatants, updateCombatant, moveTie, next } =
      store.getState();
    expect(addCombatants([])).toBe(false);
    addCombatant(row('one', 12, 'Zed'));
    addCombatants([row('two', 12, 'Ash'), row('three', 3, 'Low')]);
    const [zed, ash, low] = store.getState().combatants;
    expect(new Set(store.getState().combatants.map(({ id }) => id)).size).toBe(3);
    next();
    expect(updateCombatant('missing', { ac: 15 })).toBe(false);
    expect(updateCombatant(zed!.id, { ac: 15, conditions: 'Prone' })).toBe(true);
    moveTie('missing', 1);
    moveTie(low!.id, 1);
    moveTie(low!.id, -1);
    expect(store.getState().combatants.map(({ name }) => name)).toEqual([
      'Zed',
      'Ash',
      'Low',
    ]);
    moveTie(ash!.id, -1);
    expect(createInitiativeStore().getState()).toMatchObject({
      turnId: zed!.id,
      combatants: [
        { name: 'Ash' },
        { name: 'Zed', ac: 15, conditions: 'Prone' },
        { name: 'Low' },
      ],
    });
  });

  it('selects the next combatant on active removal, wraps the round and restores the exact state on undo', () => {
    const store = createInitiativeStore();
    const entries = [row('first', 20), row('active', 14), row('last', 4)];
    const { removeCombatant, undo, clear } = store.getState();
    expect(clear()).toBe(false);
    expect(undo()).toBe(false);
    expect(removeCombatant('missing')).toBe(false);
    store.setState({ combatants: entries, round: 2, turnId: 'active' });
    removeCombatant('active');
    expect(store.getState()).toMatchObject({ round: 2, turnId: 'last' });
    removeCombatant('last');
    expect(store.getState()).toMatchObject({ round: 3, turnId: 'first' });
    expect(undo()).toBe(true);
    expect(store.getState()).toMatchObject({
      combatants: [entries[0], entries[2]],
      round: 2,
      turnId: 'last',
    });
    removeCombatant('first');
    expect(store.getState()).toMatchObject({ round: 2, turnId: 'last' });
    removeCombatant('last');
    expect(store.getState()).toMatchObject(emptyInitiative());
    undo();
    clear();
    expect(store.getState()).toMatchObject(emptyInitiative());
    undo();
    expect(store.getState()).toMatchObject({
      combatants: [entries[2]],
      round: 2,
      turnId: 'last',
    });
  });
});

describe('initiative storage', () => {
  it('loads legacy values and tie ordering without touching the original snapshot', () => {
    const saved = older(
      [row('z', 10), { ...row('a', 10), hpCurrent: 0, hpMax: -3.5 }],
      4,
      'a',
    );
    localStorage.setItem(INITIATIVE_KEY, saved);
    const store = createInitiativeStore();
    expect(store.getState()).toMatchObject({
      combatants: [{ id: 'a', hpCurrent: 0, hpMax: -3.5 }, { id: 'z' }],
      round: 4,
      turnId: 'a',
      status: 'saved',
    });
    expect(localStorage.getItem(INITIATIVE_KEY)).toBe(saved);
    store.getState().updateCombatant('a', { conditions: 'Poisoned' });
    expect(parseStoredInitiative(localStorage.getItem(INITIATIVE_KEY)!)).toMatchObject({
      combatants: [{ id: 'a', hpMax: -3.5, conditions: 'Poisoned' }, { id: 'z' }],
    });
  });

  it.each([
    '{broken',
    older([row('a', 5), row('a', 3)]),
    '{"version":99,"state":{}}',
    '{"version":2,"state":{"combatants":null}}',
  ])('protects unreadable saved contents until explicit replacement (%s)', (saved) => {
    localStorage.setItem(INITIATIVE_KEY, saved);
    const store = createInitiativeStore();
    expect(store.getState()).toMatchObject({
      status: 'unreadable',
      raw: saved,
      combatants: [],
    });
    const { addCombatant, next, retrySave, reloadStored, replaceStored } =
      store.getState();
    next();
    retrySave();
    expect(reloadStored()).toBe(false);
    expect(addCombatant(row('new', 2))).toBe(false);
    expect(replaceStored('obsolete')).toBe(false);
    expect(localStorage.getItem(INITIATIVE_KEY)).toBe(saved);
    expect(replaceStored(saved)).toBe(true);
    expect(store.getState()).toMatchObject({
      status: 'saved',
      raw: null,
      combatants: [],
    });
  });

  it('keeps failed writes in memory, retries them, and rejects intervening writes from another tab', () => {
    const saved = older([row('a', 10)]);
    localStorage.setItem(INITIATIVE_KEY, saved);
    const store = createInitiativeStore();
    const { updateCombatant, retrySave, checkStorage, reloadStored, restore } =
      store.getState();
    const writer = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    try {
      expect(updateCombatant('a', { hpCurrent: 6 })).toBe(true);
      expect(localStorage.getItem(INITIATIVE_KEY)).toBe(saved);
      expect(store.getState()).toMatchObject({
        dirty: true,
        status: 'unsaved',
        combatants: [{ hpCurrent: 6 }],
      });
      retrySave();
      expect(store.getState().status).toBe('saved');
      const other = serializeInitiative({
        combatants: [{ ...row('a', 10), hpCurrent: 9 }],
        round: 1,
        turnId: 'a',
      });
      localStorage.setItem(INITIATIVE_KEY, other);
      expect(updateCombatant('a', { hpCurrent: 3 })).toBe(false);
      expect(restore(emptyInitiative())).toBe(false);
      expect(checkStorage()).toBe(false);
      expect(store.getState()).toMatchObject({ status: 'conflict', raw: other });
      expect(localStorage.getItem(INITIATIVE_KEY)).toBe(other);
      expect(reloadStored()).toBe(true);
      expect(store.getState()).toMatchObject({
        status: 'saved',
        combatants: [{ hpCurrent: 9 }],
      });
      expect(restore(emptyInitiative())).toBe(true);
    } finally {
      writer.mockRestore();
    }
  });

  it('recovers a temporarily unavailable storage read without discarding pending edits', () => {
    const store = createInitiativeStore();
    const writer = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error();
    });
    const reader = vi.spyOn(Storage.prototype, 'getItem');
    try {
      store.getState().addCombatant(row('a', 10));
      reader.mockImplementation(() => {
        throw new Error();
      });
      expect(store.getState().checkStorage()).toBe(false);
      expect(store.getState().replaceStored(null)).toBe(false);
      expect(store.getState().status).toBe('unreadable');
      reader.mockRestore();
      expect(store.getState().checkStorage()).toBe(true);
      expect(store.getState().status).toBe('unsaved');
      expect(store.getState().combatants).toHaveLength(1);
      store.getState().retrySave();
      expect(store.getState().status).toBe('saved');
    } finally {
      reader.mockRestore();
      writer.mockRestore();
    }
  });

  it('retries a confirmed replacement after a write failure without losing the original', () => {
    const raw = '{broken';
    localStorage.setItem(INITIATIVE_KEY, raw);
    const store = createInitiativeStore();
    const writer = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    try {
      const restored = { combatants: [row('a', 10)], round: 1, turnId: 'a' };
      expect(store.getState().replaceStored(raw, restored)).toBe(true);
      expect(store.getState()).toMatchObject({ ...restored, status: 'unsaved', raw });
      expect(localStorage.getItem(INITIATIVE_KEY)).toBe(raw);
      store.getState().retrySave();
      expect(store.getState()).toMatchObject({ ...restored, status: 'saved', raw: null });
      expect(parseStoredInitiative(localStorage.getItem(INITIATIVE_KEY)!)).toEqual(
        restored,
      );
    } finally {
      writer.mockRestore();
    }
  });
});
