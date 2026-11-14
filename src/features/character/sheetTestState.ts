import { screen } from '@testing-library/react';
import type { Character } from './model';

export function currentCharacter(): Character {
  return JSON.parse(screen.getByTestId('character-state').textContent!) as Character;
}
