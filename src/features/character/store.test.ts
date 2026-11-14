import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHARACTERS_KEY, serializeCharacters } from './characterData';
import { createCharacter } from './model';
import {
  createCharacterStore,
  useCharacter,
  useCharacterList,
  useCharacterStore,
} from './store';

function stored() {
  return JSON.parse(localStorage.getItem(CHARACTERS_KEY)!) as {
    version: number;
    state: { characters: Record<string, { name: string }>; order: string[] };
  };
}

describe('character store', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds, updates, saves and ignores unchanged updates', () => {
    const store = createCharacterStore();
    expect(store.getState().status).toBe('saved');
    const id = store.getState().addCharacter('Hero');
    expect(stored().state.order).toEqual([id]);
    expect(stored().version).toBe(3);

    const before = store.getState().characters[id]!.updatedAt;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    store.getState().updateCharacter(id, { name: 'Hero', level: 1 });
    expect(setItem).not.toHaveBeenCalled();
    expect(store.getState().characters[id]!.updatedAt).toBe(before);

    store.getState().updateCharacter(id, { name: 'Mira' });
    expect(stored().state.characters[id]!.name).toBe('Mira');
    store.getState().updateCharacter('missing', { name: 'Nobody' });

    const imported = { ...createCharacter('Imported'), id: 'imported' };
    store.getState().saveCharacter(imported);
    store.getState().saveCharacter({ ...imported, name: 'Imported again' });
    expect(stored().state.order).toEqual([id, 'imported']);
    expect(stored().state.characters.imported!.name).toBe('Imported again');
  });

  it('deletes with undo at the original position', () => {
    const store = createCharacterStore();
    const a = store.getState().addCharacter('A');
    const b = store.getState().addCharacter('B');
    const c = store.getState().addCharacter('C');
    expect(store.getState().deleteCharacter('missing')).toBe(false);
    expect(store.getState().deleteCharacter(b)).toBe(true);
    expect(store.getState().order).toEqual([a, c]);
    expect(store.getState().undoDelete()).toBe(b);
    expect(store.getState().order).toEqual([a, b, c]);
    expect(store.getState().undoDelete()).toBeNull();

    store.getState().deleteCharacter(c);
    store.getState().saveCharacter(store.getState().deleted!.character);
    expect(store.getState().undoDelete()).toBeNull();
  });

  it('duplicates next to the source and imports in every mode', () => {
    const store = createCharacterStore();
    const a = store.getState().addCharacter('A');
    const b = store.getState().addCharacter('B');
    expect(store.getState().duplicateCharacter('missing', 'x')).toBeNull();
    const copy = store.getState().duplicateCharacter(a, 'A (copy)')!;
    expect(store.getState().order).toEqual([a, copy, b]);

    const incoming = { ...store.getState().characters[a]!, name: 'A from file' };
    const fresh = createCharacter('Fresh');
    const copied = store
      .getState()
      .importCharacters([incoming, fresh], 'copy', (character) => `${character.name} 2`);
    expect(copied[0]).not.toBe(a);
    expect(store.getState().characters[copied[0]!]!.name).toBe('A from file 2');
    expect(copied[1]).toBe(fresh.id);
    expect(store.getState().characters[a]!.name).toBe('A');

    store.getState().importCharacters([incoming], 'replace', () => 'unused');
    expect(store.getState().characters[a]!.name).toBe('A from file');
    expect(store.getState().order.indexOf(a)).toBe(0);

    store.getState().importCharacters([fresh], 'replaceAll', () => 'unused');
    expect(store.getState().order).toEqual([fresh.id]);
  });

  it('keeps failed writes in memory and retries them', () => {
    const store = createCharacterStore();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const id = store.getState().addCharacter('Pending');
    expect(store.getState()).toMatchObject({ status: 'unsaved', dirty: true });
    expect(store.getState().characters[id]).toBeDefined();
    expect(store.getState().retrySave()).toBe(false);
    setItem.mockRestore();
    expect(store.getState().retrySave()).toBe(true);
    expect(store.getState()).toMatchObject({ status: 'saved', dirty: false });
    expect(stored().state.order).toEqual([id]);
  });

  it('adopts clean external changes and reports conflicts with local changes', () => {
    const store = createCharacterStore();
    store.getState().addCharacter('Local');
    const other = createCharacter('Other tab');
    localStorage.setItem(
      CHARACTERS_KEY,
      serializeCharacters({ characters: { [other.id]: other }, order: [other.id] }),
    );
    expect(store.getState().checkStorage()).toBe(true);
    expect(store.getState().order).toEqual([other.id]);

    localStorage.setItem(
      CHARACTERS_KEY,
      serializeCharacters({ characters: {}, order: [] }),
    );
    store.getState().updateCharacter(other.id, { name: 'Mine' });
    expect(store.getState().status).toBe('conflict');
    expect(store.getState().raw).toContain('"order":[]');
    expect(store.getState().characters[other.id]!.name).toBe('Mine');
    expect(store.getState().retrySave()).toBe(false);

    expect(store.getState().replaceStored('different')).toBe(false);
    expect(store.getState().replaceStored(store.getState().raw)).toBe(true);
    expect(stored().state.characters[other.id]!.name).toBe('Mine');
    expect(store.getState().status).toBe('saved');
  });

  it('reloads the stored version after a conflict', () => {
    const store = createCharacterStore();
    store.getState().addCharacter('Local');
    const other = createCharacter('Saved');
    localStorage.setItem(
      CHARACTERS_KEY,
      serializeCharacters({ characters: { [other.id]: other }, order: [other.id] }),
    );
    store.getState().addCharacter('Second');
    expect(store.getState().status).toBe('conflict');
    expect(store.getState().reloadStored()).toBe(true);
    expect(store.getState()).toMatchObject({ status: 'saved', order: [other.id] });
    store.setState({ dirty: true, status: 'conflict' });
    expect(store.getState().checkStorage()).toBe(true);
    expect(store.getState().status).toBe('unsaved');
    store.setState({ dirty: false, status: 'unreadable' });
    expect(store.getState().checkStorage()).toBe(true);
    expect(store.getState().status).toBe('saved');
  });

  it('protects unreadable stored data until explicit replacement', () => {
    localStorage.setItem(CHARACTERS_KEY, '{broken');
    const store = createCharacterStore();
    expect(store.getState()).toMatchObject({ status: 'unreadable', raw: '{broken' });
    store.getState().addCharacter('Kept in memory');
    expect(localStorage.getItem(CHARACTERS_KEY)).toBe('{broken');
    expect(store.getState().reloadStored()).toBe(false);
    expect(store.getState().status).toBe('unreadable');
    expect(store.getState().replaceStored('{broken')).toBe(true);
    expect(stored().state.order).toHaveLength(1);
  });

  it('treats inaccessible storage as unreadable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const store = createCharacterStore();
    expect(store.getState().status).toBe('unreadable');
    expect(store.getState().replaceStored(null)).toBe(false);
    expect(store.getState().reloadStored()).toBe(false);
  });

  it('checks storage when another tab changes characters', () => {
    const check = vi.fn(() => true);
    useCharacterStore.setState({ checkStorage: check });
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CHARACTERS_KEY }));
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'fumble-other' }));
    });
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('exposes ordered characters through hooks', () => {
    const hero = createCharacter('Hero');
    useCharacterStore.setState({
      characters: { [hero.id]: hero },
      order: ['missing', hero.id],
    });
    expect(renderHook(() => useCharacterList()).result.current).toEqual([hero]);
    expect(renderHook(() => useCharacter(hero.id)).result.current).toBe(hero);
    expect(renderHook(() => useCharacter(undefined)).result.current).toBeUndefined();
  });
});
