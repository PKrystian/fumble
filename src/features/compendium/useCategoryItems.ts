import { useEffect, useMemo, useState } from 'react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import type {
  HomebrewImportedEntry,
  HomebrewManualEntry,
} from '@/features/homebrew/store';
import { homebrewToItem, useHomebrewStore } from '@/features/homebrew/store';
import { useLocale } from '@/i18n/path';
import type { CompendiumCategory } from './categories';

interface CategoryItemsState {
  status: 'loading' | 'ready' | 'error';
  items: CompendiumEntryBase[];
}

export function useCategoryItems(
  category: CompendiumCategory | undefined,
): CategoryItemsState {
  const locale = useLocale();
  const [state, setState] = useState<CategoryItemsState>({
    status: 'loading',
    items: [],
  });
  const homebrew = useHomebrewStore((s) => s.entries);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setState({ status: 'loading', items: [] });

    loadLocalizedItems(category.id, category.load, locale)
      .then((items) => {
        if (!cancelled) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [category, locale]);

  const items = useMemo(() => {
    if (!category) return state.items;
    const hb = homebrew
      .filter(
        (e): e is HomebrewManualEntry | HomebrewImportedEntry =>
          e.kind !== 'subclass' && e.category === category.id,
      )
      .map(homebrewToItem);
    if (hb.length === 0) return state.items;
    return [...hb, ...state.items].sort((a, b) => a.name.localeCompare(b.name));
  }, [state.items, homebrew, category]);

  return { status: state.status, items };
}
