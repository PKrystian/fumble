import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Character, createCharacter } from './model';

interface CharacterState {
  characters: Record<string, Character>;
  order: string[];

  addCharacter: (name?: string) => string;

  saveCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      characters: {},
      order: [],
      addCharacter: (name) => {
        const character = createCharacter(name);
        set((state) => ({
          characters: { ...state.characters, [character.id]: character },
          order: [...state.order, character.id],
        }));
        return character.id;
      },
      saveCharacter: (character) => {
        set((state) => ({
          characters: {
            ...state.characters,
            [character.id]: { ...character, updatedAt: Date.now() },
          },
        }));
      },
      deleteCharacter: (id) => {
        set((state) => {
          const characters = { ...state.characters };
          delete characters[id];
          return { characters, order: state.order.filter((entry) => entry !== id) };
        });
      },
    }),
    { name: 'fumble-characters', version: 1 },
  ),
);

export function useCharacterList(): Character[] {
  const characters = useCharacterStore((state) => state.characters);
  const order = useCharacterStore((state) => state.order);
  return order.map((id) => characters[id]!);
}

export function useCharacter(id: string | undefined): Character | undefined {
  return useCharacterStore((state) => (id ? state.characters[id] : undefined));
}
