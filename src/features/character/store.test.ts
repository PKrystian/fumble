import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCharacter } from './model';
import { useCharacter, useCharacterList, useCharacterStore } from './store';

function reset() {
  useCharacterStore.setState({ characters: {}, order: [] });
}

function listedIds() {
  const { characters, order } = useCharacterStore.getState();
  return order.filter((id) => characters[id]);
}

describe('character store', () => {
  beforeEach(reset);

  it('adds a new character to the visible order', () => {
    const id = useCharacterStore.getState().addCharacter('Hero');
    expect(listedIds()).toEqual([id]);
  });

  it('saving an unknown character makes it visible (import path)', () => {
    const imported = { ...createCharacter('Imported'), id: 'imported-1' };

    useCharacterStore.getState().saveCharacter(imported);

    const { characters, order } = useCharacterStore.getState();
    expect(characters['imported-1']?.name).toBe('Imported');
    expect(order).toContain('imported-1');
    expect(listedIds()).toEqual(['imported-1']);
  });

  it('saving an existing character updates it without duplicating the order entry', () => {
    const id = useCharacterStore.getState().addCharacter('Hero');
    const existing = useCharacterStore.getState().characters[id]!;

    useCharacterStore.getState().saveCharacter({ ...existing, name: 'Renamed' });

    const { characters, order } = useCharacterStore.getState();
    expect(characters[id]?.name).toBe('Renamed');
    expect(order).toEqual([id]);
  });

  it('migrates stranded characters saved before the import fix back into the order', () => {
    const migrate = useCharacterStore.persist.getOptions().migrate!;

    const stranded = migrate(
      {
        characters: { a: { id: 'a', name: 'Stranded' }, b: { id: 'b', name: 'Listed' } },
        order: ['b', 'ghost'],
      },
      1,
    ) as { order: string[] };

    expect(stranded.order).toContain('a');
    expect(stranded.order).not.toContain('ghost');
    expect(stranded.order).toEqual(['b', 'a']);
  });

  it('migrates empty and unordered persisted state', () => {
    const migrate = useCharacterStore.persist.getOptions().migrate!;
    expect((migrate(undefined, 1) as { order: string[] }).order).toEqual([]);
    expect(
      (
        migrate({ characters: { a: { id: 'a', name: 'Recovered' } } }, 1) as {
          order: string[];
        }
      ).order,
    ).toEqual(['a']);
  });

  it('deleting a character removes it from both the map and the order', () => {
    const id = useCharacterStore.getState().addCharacter('Hero');
    useCharacterStore.getState().deleteCharacter(id);

    const { characters, order } = useCharacterStore.getState();
    expect(characters[id]).toBeUndefined();
    expect(order).not.toContain(id);
  });

  it('selects ordered characters and filters stale ids', () => {
    const character = { ...createCharacter('Hero'), id: 'hero' };
    useCharacterStore.setState({
      characters: { hero: character },
      order: ['missing', 'hero'],
    });

    const list = renderHook(() => useCharacterList());
    const selected = renderHook(() => useCharacter('hero'));
    const missing = renderHook(() => useCharacter(undefined));

    expect(list.result.current).toEqual([character]);
    expect(selected.result.current).toBe(character);
    expect(missing.result.current).toBeUndefined();
  });
});
