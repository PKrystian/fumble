import { useState, type ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Character } from './model';
import type { SectionProps } from './sections';
import { SheetSyncContext } from './sync';

export function SheetHarness({
  initial,
  component: Component,
  computed = null,
  path = '/character/x',
}: {
  initial: Character;
  component: ComponentType<SectionProps>;
  computed?: Partial<Character> | null;
  path?: string;
}) {
  const [character, setCharacter] = useState(initial);
  return (
    <MemoryRouter initialEntries={[path]}>
      <SheetSyncContext.Provider value={computed}>
        <Component
          character={character}
          update={(patch) => setCharacter((current) => ({ ...current, ...patch }))}
        />
      </SheetSyncContext.Provider>
      <output data-testid="character-state">{JSON.stringify(character)}</output>
    </MemoryRouter>
  );
}
