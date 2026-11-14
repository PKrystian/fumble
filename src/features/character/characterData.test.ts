import { describe, expect, it } from 'vitest';
import {
  CHARACTER_VERSION,
  characterFileText,
  copyCharacter,
  emptyCharacters,
  isStoredCharacter,
  parseCharacterFile,
  parseStoredCharacters,
  readCharacter,
  readCharacterCollection,
  safeFilename,
  serializeCharacters,
} from './characterData';
import { LEGACY_SYNC, createCharacter } from './model';

describe('character data', () => {
  it('fills missing fields from defaults and marks legacy synchronization', () => {
    const character = readCharacter({ id: 'hero', name: 'Mira', level: 4, extra: 'x' });
    expect(character).toMatchObject({
      id: 'hero',
      name: 'Mira',
      level: 4,
      syncSignature: LEGACY_SYNC,
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      deathSaves: { successes: 0, failures: 0 },
      hitDiceUsed: 0,
      manualFields: [],
    });
    expect(character).not.toHaveProperty('extra');
    expect(readCharacter({ id: 'unnamed' })?.name).toBe('');
  });

  it('keeps current fields and rejects wrong types', () => {
    const current = createCharacter('Ada');
    expect(readCharacter(current)).toEqual(current);
    expect(readCharacter({ ...current, abilities: 'nope' })).toBeNull();
    expect(readCharacter({ ...current, manualFields: ['unknown'] })).toBeNull();
    expect(readCharacter({ ...current, role: undefined })).toEqual({
      ...current,
      role: 'party',
    });
    expect(readCharacter({ id: ' ' })).toBeNull();
    expect(readCharacter(null)).toBeNull();
    expect(readCharacter([])).toBeNull();
    expect(isStoredCharacter(current)).toBe(true);
    expect(isStoredCharacter({})).toBe(false);
  });

  it('reads and repairs stored collections', () => {
    const a = createCharacter('A');
    const b = createCharacter('B');
    const collection = readCharacterCollection({
      version: 2,
      state: { characters: { [a.id]: a, [b.id]: b }, order: [b.id, b.id, 'missing'] },
    });
    expect(collection?.order).toEqual([b.id, a.id]);
    expect(readCharacterCollection({ state: {} })).toEqual(emptyCharacters());
    for (const value of [
      null,
      { state: null },
      { state: {}, version: -1 },
      { state: {}, version: 0.5 },
      { state: {}, version: '1' },
      { state: {}, version: CHARACTER_VERSION + 1 },
      { state: { injected: true }, version: 1 },
      { state: { characters: [] }, version: 1 },
      { state: { order: ['x', 1] }, version: 1 },
      { state: { characters: { other: a } }, version: 1 },
    ]) {
      expect(readCharacterCollection(value)).toBeNull();
    }
  });

  it('serializes and parses stored text', () => {
    const hero = createCharacter('Hero');
    const text = serializeCharacters({
      characters: { [hero.id]: hero },
      order: [hero.id],
    });
    expect(JSON.parse(text).version).toBe(CHARACTER_VERSION);
    expect(parseStoredCharacters(text)?.characters[hero.id]).toEqual(hero);
    expect(parseStoredCharacters('{broken')).toBeNull();
  });

  it('parses single, legacy, collection and backup files', () => {
    const hero = createCharacter('Hero');
    const legacy = parseCharacterFile(JSON.stringify(hero));
    expect(legacy).toMatchObject({ kind: 'character', version: 1, layout: undefined });
    const wrapped = parseCharacterFile(
      JSON.stringify({
        version: 1,
        character: hero,
        layout: { zones: {} },
        exportedAt: '2026-11-10T10:00:00.000Z',
      }),
    );
    expect(wrapped).toMatchObject({
      kind: 'character',
      layout: { zones: {} },
      exportedAt: '2026-11-10T10:00:00.000Z',
    });
    const collection = parseCharacterFile(characterFileText([hero], { zones: {} }));
    expect(collection).toMatchObject({ kind: 'collection', version: 2 });
    expect(collection.characters).toEqual([hero]);
    expect(
      parseCharacterFile(JSON.stringify({ app: 'fumble-characters', characters: [] })),
    ).toMatchObject({ version: 2, exportedAt: null, characters: [] });

    const backup = parseCharacterFile(
      JSON.stringify({
        app: 'fumble',
        version: 1,
        exportedAt: 'not a date',
        data: {
          'fumble-characters': serializeCharacters({
            characters: { [hero.id]: hero },
            order: [hero.id],
          }),
          'fumble-sheet-layout': JSON.stringify({ state: { zones: { left: [] } } }),
        },
      }),
    );
    expect(backup).toMatchObject({
      kind: 'backup',
      exportedAt: null,
      layout: { zones: { left: [] } },
      version: 1,
    });
    const noLayout = parseCharacterFile(
      JSON.stringify({
        app: 'fumble',
        data: {
          'fumble-characters': serializeCharacters(emptyCharacters()),
          'fumble-sheet-layout': '{broken',
        },
      }),
    );
    expect(noLayout).toMatchObject({ layout: undefined, version: 1, characters: [] });
    expect(
      parseCharacterFile(
        JSON.stringify({
          app: 'fumble',
          data: {
            'fumble-characters': serializeCharacters(emptyCharacters()),
            'fumble-sheet-layout': '[]',
          },
        }),
      ).layout,
    ).toBeUndefined();
  });

  it('rejects invalid files with named reasons', () => {
    expect(() => parseCharacterFile('[]')).toThrow('character-file-invalid');
    expect(() => parseCharacterFile('{"app":"fumble","data":{}}')).toThrow(
      'character-file-empty',
    );
    expect(() => parseCharacterFile('{"app":"fumble"}')).toThrow('character-file-empty');
    expect(() =>
      parseCharacterFile('{"app":"fumble","data":{"fumble-characters":"{}"}}'),
    ).toThrow('character-file-invalid');
    expect(() =>
      parseCharacterFile('{"app":"fumble-characters","characters":{}}'),
    ).toThrow('character-file-invalid');
    expect(() =>
      parseCharacterFile('{"app":"fumble-characters","characters":[{"id":""}]}'),
    ).toThrow('character-file-invalid');
    expect(() => parseCharacterFile('{"name":"No id"}')).toThrow(
      'character-file-invalid',
    );
    expect(() => parseCharacterFile('x'.repeat(10 * 1024 * 1024 + 1))).toThrow(
      'character-file-too-large',
    );
    expect(() => parseCharacterFile('{broken')).toThrow(SyntaxError);
    const huge = createCharacter('Huge');
    huge.notes = 'x'.repeat(10 * 1024 * 1024);
    expect(() => characterFileText([huge])).toThrow('character-file-too-large');
  });

  it('copies characters with new identity and safe filenames', () => {
    const hero = createCharacter('Hero');
    hero.inventory = [{ id: 'i', name: 'Rope', notes: '', quantity: 1 }];
    const copy = copyCharacter(hero, 'Hero (copy)');
    expect(copy.id).not.toBe(hero.id);
    expect(copy.name).toBe('Hero (copy)');
    expect(copy.inventory).toEqual(hero.inventory);
    expect(copy.inventory).not.toBe(hero.inventory);
    expect(safeFilename('  Mira: the/Bold\u0007  ', 'x')).toBe('Mira the Bold');
    expect(safeFilename('...', 'character')).toBe('character');
    expect(safeFilename('Żółć', 'x')).toBe('Żółć');
  });
});
