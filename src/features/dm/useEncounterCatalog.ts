import { useMemo } from 'react';
import { applyContentMode } from '@/features/compendium/contentFilter';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import {
  creatureHabitats,
  creatureSearchNames,
  encounterCreature,
} from './encounterModel';

const bestiary = getCategory('bestiary');

export function useEncounterCatalog(selectedId: string | undefined, retryKey: number) {
  const mode = useContentModeStore((state) => state.mode);
  const showHomebrew = useFumbleHomebrewStore((state) => state.showInCompendium);
  const { items, status } = useCategoryItems(
    bestiary,
    true,
    selectedId,
    undefined,
    retryKey,
  );
  const visible = useMemo(
    () => applyContentMode(items, mode, showHomebrew),
    [items, mode, showHomebrew],
  );
  const rows = useMemo(
    () =>
      visible.map((item) => ({
        creature: encounterCreature(item),
        names: creatureSearchNames(item),
        habitats: creatureHabitats(item),
      })),
    [visible],
  );
  return { items, rows, status, mode };
}
