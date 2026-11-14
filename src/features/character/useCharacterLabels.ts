import { useCallback } from 'react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import type { Character } from './model';

function resolveName(items: CompendiumEntryBase[], value: string): string {
  const term = value.trim();
  if (!term) return '';
  const lower = term.toLowerCase();
  const match =
    items.find((item) => item.id === term) ??
    items.find(
      (item) =>
        item.name.toLowerCase() === lower || item.englishName?.toLowerCase() === lower,
    );
  return match?.name ?? term;
}

export interface CharacterLabels {
  className: string;
  species: string;
  background: string;
  englishClass: string;
  englishSpecies: string;
}

export function useCharacterLabels() {
  const classes = useCategoryItems(getCategory('classes')).items;
  const species = useCategoryItems(getCategory('species')).items;
  const backgrounds = useCategoryItems(getCategory('backgrounds')).items;

  return useCallback(
    (character: Character): CharacterLabels => {
      const englishOf = (items: CompendiumEntryBase[], value: string) => {
        const match = items.find((item) => item.id === value.trim());
        return match?.englishName ?? match?.name ?? value;
      };
      return {
        className: resolveName(classes, character.className),
        species: resolveName(species, character.species),
        background: resolveName(backgrounds, character.background),
        englishClass: englishOf(classes, character.className),
        englishSpecies: englishOf(species, character.species),
      };
    },
    [classes, species, backgrounds],
  );
}
