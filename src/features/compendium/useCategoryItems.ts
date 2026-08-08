import { useEffect, useMemo, useState } from 'react';
import type {
  ClassEntry,
  CompendiumEntryBase,
  SpellEntry,
} from '@/data/compendium/types';
import { loadLocalizedItems } from '@/data/compendium/overlay';
import type {
  HomebrewImportedEntry,
  HomebrewManualEntry,
} from '@/features/homebrew/store';
import { homebrewToItem, useHomebrewStore } from '@/features/homebrew/store';
import {
  fumbleHomebrewItems,
  fumbleParentClassId,
  fumbleSubclass,
  isFumbleAlwaysVisible,
} from '@/features/homebrew/fumbleHomebrew';
import { useFumbleHomebrewStore } from '@/features/homebrew/fumbleHomebrewStore';
import { useLocale } from '@/i18n/path';
import type { CompendiumCategory } from './categories';

interface CategoryItemsState {
  status: 'loading' | 'ready' | 'error';
  items: CompendiumEntryBase[];
}

export function useCategoryItems(
  category: CompendiumCategory | undefined,
  includeFumble = false,
  selectedId?: string,
  selectedFumbleSubclassId?: string | string[],
): CategoryItemsState {
  const locale = useLocale();
  const [state, setState] = useState<CategoryItemsState>({
    status: 'loading',
    items: [],
  });
  const homebrew = useHomebrewStore((s) => s.entries);
  const showFumbleHomebrew = useFumbleHomebrewStore((s) => s.showInCompendium);
  const selectedFumbleSubclassKey = Array.isArray(selectedFumbleSubclassId)
    ? selectedFumbleSubclassId.join('\u0000')
    : (selectedFumbleSubclassId ?? '');
  const selectedFumbleSubclassIds = useMemo(
    () => (selectedFumbleSubclassKey ? selectedFumbleSubclassKey.split('\u0000') : []),
    [selectedFumbleSubclassKey],
  );

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
      .map((e) => homebrewToItem(e, locale, homebrew));
    const allFumbleCatalog = fumbleHomebrewItems(locale);
    const fumbleCatalog = allFumbleCatalog.filter(
      (item) => item.category === category.id,
    );
    const witchSpellIds = new Set(
      allFumbleCatalog.find((item) => item.id === 'witch')?.spellList ?? [],
    );
    const witchClass = locale === 'pl' ? 'Wiedźma' : 'Witch';
    const selectedFumbleSubclass = fumbleCatalog.find(
      (item) => item.id === selectedId && item.isSubclass,
    );
    const fumble = includeFumble
      ? fumbleCatalog
          .filter((item) => !item.isSubclass)
          .map((item) => {
            if (category.id !== 'spells' || witchClass === 'Witch') return item;
            const spell = item as unknown as SpellEntry;
            if (!spell.classes?.includes('Witch')) return item;
            return {
              ...item,
              classes: spell.classes.map((value) =>
                value === 'Witch' ? witchClass : value,
              ),
            };
          })
      : [];
    if (selectedFumbleSubclass && includeFumble) fumble.push(selectedFumbleSubclass);
    const hasAlwaysVisibleSubclass = fumbleCatalog.some(
      (item) => item.isSubclass && isFumbleAlwaysVisible(item),
    );
    const shouldMergeSubclasses =
      includeFumble &&
      (showFumbleHomebrew ||
        selectedFumbleSubclassIds.length > 0 ||
        hasAlwaysVisibleSubclass);
    const subclassByClass = new Map<string, ReturnType<typeof fumbleSubclass>>();
    if (shouldMergeSubclasses) {
      for (const item of fumbleCatalog) {
        const parentClassId = fumbleParentClassId(item);
        const subclass = fumbleSubclass(item);
        if (!parentClassId || !subclass) continue;
        if (
          !showFumbleHomebrew &&
          !isFumbleAlwaysVisible(item) &&
          !selectedFumbleSubclassIds.includes(item.id)
        )
          continue;
        subclassByClass.set(`${parentClassId}|${item.id}`, subclass);
      }
    }
    const mergedState = state.items.map((item) => {
      if (category.id === 'spells' && witchSpellIds.has(item.id)) {
        const spell = item as SpellEntry;
        if (spell.classes?.includes(witchClass)) return item;
        return { ...spell, classes: [...(spell.classes ?? []), witchClass] };
      }
      if (category.id !== 'classes' || subclassByClass.size === 0) return item;
      const cls = item as ClassEntry;
      const customSubclasses = [...subclassByClass.entries()]
        .filter(([key]) => key.startsWith(`${cls.id}|`))
        .map(([, subclass]) => subclass)
        .filter((subclass): subclass is NonNullable<typeof subclass> => subclass != null);
      if (customSubclasses.length === 0) return item;
      const existing = new Set(
        cls.subclasses.map((subclass) => `${subclass.name}|${subclass.source}`),
      );
      const additions = customSubclasses.filter(
        (subclass) => !existing.has(`${subclass.name}|${subclass.source}`),
      );
      return {
        ...cls,
        subclasses: [...cls.subclasses, ...additions],
        ...(selectedFumbleSubclassIds.length > 0 &&
        additions.some((subclass) =>
          selectedFumbleSubclassIds.includes(subclass.id ?? ''),
        )
          ? { _fumbleSelectedSubclassId: selectedFumbleSubclassIds[0] }
          : {}),
      };
    });
    if (hb.length === 0 && fumble.length === 0 && mergedState === state.items)
      return state.items;
    return [...hb, ...fumble, ...mergedState].sort((a, b) =>
      a.name.localeCompare(b.name, locale),
    );
  }, [
    state.items,
    homebrew,
    category,
    locale,
    includeFumble,
    selectedId,
    selectedFumbleSubclassIds,
    showFumbleHomebrew,
  ]);

  return { status: state.status, items };
}
