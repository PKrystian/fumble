import { create } from 'zustand';
import {
  CHARACTERS_KEY,
  copyCharacter,
  emptyCharacters,
  parseStoredCharacters,
  serializeCharacters,
  type CharacterCollection,
} from './characterData';
import { type Character, createCharacter } from './model';

export type CharacterSaveStatus = 'saved' | 'unsaved' | 'unreadable' | 'conflict';
export type CharacterImportMode = 'copy' | 'replace' | 'replaceAll';

interface DeletedCharacter {
  character: Character;
  index: number;
}

interface CharacterState extends CharacterCollection {
  status: CharacterSaveStatus;
  raw: string | null;
  dirty: boolean;
  deleted: DeletedCharacter | null;

  addCharacter: (name?: string) => string;
  saveCharacter: (character: Character) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => boolean;
  undoDelete: () => string | null;
  duplicateCharacter: (id: string, name: string) => string | null;
  importCharacters: (
    characters: Character[],
    mode: CharacterImportMode,
    copyName: (character: Character) => string,
  ) => string[];
  checkStorage: () => boolean;
  retrySave: () => boolean;
  reloadStored: () => boolean;
  replaceStored: (expected: string | null) => boolean;
}

function readRaw() {
  try {
    return { raw: window.localStorage.getItem(CHARACTERS_KEY), readable: true };
  } catch {
    return { raw: null, readable: false };
  }
}

function decode(raw: string | null): CharacterCollection | null {
  return raw === null ? emptyCharacters() : parseStoredCharacters(raw);
}

function same(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

export function createCharacterStore() {
  return create<CharacterState>((set, get) => {
    const initial = readRaw();
    const initialData = initial.readable ? decode(initial.raw) : null;
    let lastStored = initial.raw;
    let canWrite = Boolean(initialData);

    const snapshot = (): CharacterCollection => ({
      characters: get().characters,
      order: get().order,
    });

    const checkStorage = () => {
      const { raw, readable } = readRaw();
      if (readable && canWrite && raw === lastStored) {
        const { status, dirty } = get();
        if (status === 'conflict' || status === 'unreadable')
          set({ status: dirty ? 'unsaved' : 'saved', raw: null });
        return true;
      }
      const data = readable ? decode(raw) : null;
      if (data && canWrite && !get().dirty) {
        lastStored = raw;
        set({ ...data, status: 'saved', raw: null });
        return true;
      }
      set({ status: data ? 'conflict' : 'unreadable', raw });
      return false;
    };

    const write = () => {
      const serialized = serializeCharacters(snapshot());
      try {
        window.localStorage.setItem(CHARACTERS_KEY, serialized);
      } catch {
        set({ status: 'unsaved', dirty: true });
        return false;
      }
      lastStored = serialized;
      canWrite = true;
      set({ status: 'saved', raw: null, dirty: false });
      return true;
    };

    const commit = (data: Partial<CharacterState>) => {
      set({ ...data, dirty: true });
      if (checkStorage()) write();
    };

    return {
      ...(initialData ?? emptyCharacters()),
      status: initialData ? 'saved' : 'unreadable',
      raw: initialData ? null : initial.raw,
      dirty: false,
      deleted: null,
      addCharacter: (name) => {
        const character = createCharacter(name);
        commit({
          characters: { ...get().characters, [character.id]: character },
          order: [...get().order, character.id],
        });
        return character.id;
      },
      saveCharacter: (character) => {
        const { characters, order } = get();
        commit({
          characters: {
            ...characters,
            [character.id]: { ...character, updatedAt: Date.now() },
          },
          order: order.includes(character.id) ? order : [...order, character.id],
        });
      },
      updateCharacter: (id, patch) => {
        const character = get().characters[id];
        if (!character) return;
        const changed = Object.entries(patch).filter(
          ([key, value]) => !same(character[key as keyof Character], value),
        );
        if (changed.length === 0) return;
        commit({
          characters: {
            ...get().characters,
            [id]: { ...character, ...Object.fromEntries(changed), updatedAt: Date.now() },
          },
        });
      },
      deleteCharacter: (id) => {
        const { characters, order } = get();
        const character = characters[id];
        if (!character) return false;
        const rest = { ...characters };
        delete rest[id];
        commit({
          characters: rest,
          order: order.filter((entry) => entry !== id),
          deleted: { character, index: order.indexOf(id) },
        });
        return true;
      },
      undoDelete: () => {
        const { deleted, characters, order } = get();
        if (!deleted || characters[deleted.character.id]) return null;
        const next = [...order];
        next.splice(Math.min(deleted.index, next.length), 0, deleted.character.id);
        commit({
          characters: { ...characters, [deleted.character.id]: deleted.character },
          order: next,
          deleted: null,
        });
        return deleted.character.id;
      },
      duplicateCharacter: (id, name) => {
        const { characters, order } = get();
        const source = characters[id];
        if (!source) return null;
        const copy = copyCharacter(source, name);
        const next = [...order];
        next.splice(order.indexOf(id) + 1, 0, copy.id);
        commit({ characters: { ...characters, [copy.id]: copy }, order: next });
        return copy.id;
      },
      importCharacters: (incoming, mode, copyName) => {
        const base = mode === 'replaceAll' ? emptyCharacters() : snapshot();
        const characters = { ...base.characters };
        const order = [...base.order];
        const ids: string[] = [];
        for (const character of incoming) {
          const next =
            characters[character.id] && mode === 'copy'
              ? copyCharacter(character, copyName(character))
              : character;
          characters[next.id] = next;
          if (!order.includes(next.id)) order.push(next.id);
          ids.push(next.id);
        }
        commit({ characters, order, deleted: null });
        return ids;
      },
      checkStorage,
      retrySave: () => checkStorage() && write(),
      reloadStored: () => {
        const { raw, readable } = readRaw();
        const data = readable ? decode(raw) : null;
        if (!data) {
          set({ status: 'unreadable', raw });
          return false;
        }
        lastStored = raw;
        canWrite = true;
        set({ ...data, status: 'saved', raw: null, dirty: false, deleted: null });
        return true;
      },
      replaceStored: (expected) => {
        const { raw, readable } = readRaw();
        if (!readable || raw !== expected) {
          checkStorage();
          return false;
        }
        lastStored = raw;
        canWrite = true;
        return write();
      },
    };
  });
}

export const useCharacterStore = createCharacterStore();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CHARACTERS_KEY || event.key === null)
      useCharacterStore.getState().checkStorage();
  });
}

export function useCharacterList(): Character[] {
  const characters = useCharacterStore((state) => state.characters);
  const order = useCharacterStore((state) => state.order);
  return order
    .map((id) => characters[id])
    .filter((character): character is Character => Boolean(character));
}

export function useCharacter(id: string | undefined): Character | undefined {
  return useCharacterStore((state) => (id ? state.characters[id] : undefined));
}
