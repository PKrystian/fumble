import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useEncounterCatalog } from './useEncounterCatalog';

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({
    status: 'ready',
    items: [
      { id: 'modern', name: 'Modern', source: 'XMM', cr: '1' },
      { id: 'legacy', name: 'Legacy', source: 'MM', cr: '1' },
      { id: 'fumble', name: 'Fumble creature', source: 'Fumble', cr: '1', _fumble: true },
      { id: 'manual', name: 'Manual creature', source: 'Homebrew' },
    ],
  }),
}));

it('uses the shared edition and Fumble visibility while retaining local Homebrew', () => {
  const { result } = renderHook(() => useEncounterCatalog(undefined, 0));
  const ids = () => result.current.rows.map(({ creature }) => creature.id);
  expect(ids()).toEqual(['modern', 'legacy', 'manual']);
  act(() => useContentModeStore.getState().setMode('2014'));
  expect(ids()).toEqual(['legacy', 'manual']);
  act(() => useFumbleHomebrewStore.getState().setShowInCompendium(true));
  expect(ids()).toEqual(['legacy', 'fumble', 'manual']);
  act(() => useContentModeStore.getState().setMode('2024'));
  expect(ids()).toEqual(['modern', 'fumble', 'manual']);
});
