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
  isFumbleHomebrew,
  isFumbleAlwaysVisible,
} from '@/features/homebrew/fumbleHomebrew';
import {
  fumbleItemMatchesVisibility,
  useFumbleHomebrewStore,
} from '@/features/homebrew/fumbleHomebrewStore';
import { useLocale } from '@/i18n/pathUtils';
import type { CompendiumCategory } from './categories';
import { canonicalClassFilterValue } from './classNames';

interface CategoryItemsState {
  status: 'loading' | 'ready' | 'error';
  items: CompendiumEntryBase[];
}

export function useCategoryItems(
  category: CompendiumCategory | undefined,
  includeFumble = false,
  selectedId?: string,
  selectedFumbleSubclassId?: string | string[],
  retryKey = 0,
): CategoryItemsState {
  const locale = useLocale();
  const [state, setState] = useState<CategoryItemsState>({
    status: 'loading',
    items: [],
  });
  const homebrew = useHomebrewStore((s) => s.entries);
  const showFumbleHomebrew = useFumbleHomebrewStore((s) => s.showInCompendium);
  const compendiumCampaigns = useFumbleHomebrewStore((s) => s.compendiumCampaigns);
  const compendiumCategories = useFumbleHomebrewStore((s) => s.compendiumCategories);
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
  }, [category, locale, retryKey]);

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
    const fumbleSpellClasses = new Map<string, string[]>();
    const localizedFumbleClasses = new Map<string, string>();
    for (const classItem of allFumbleCatalog) {
      if (classItem.category !== 'classes' || classItem.isSubclass) continue;
      const englishName = classItem.englishName ?? classItem.name;
      const canonical = canonicalClassFilterValue(englishName);
      localizedFumbleClasses.set(
        canonical,
        locale === 'pl' ? classItem.name : englishName,
      );
      for (const spellId of classItem.spellList ?? []) {
        const names = fumbleSpellClasses.get(spellId) ?? [];
        names.push(locale === 'pl' ? classItem.name : englishName);
        fumbleSpellClasses.set(spellId, names);
      }
    }
    const augmentFumbleSpell = (item: CompendiumEntryBase): CompendiumEntryBase => {
      const spell = item as SpellEntry;
      const classNames = [
        ...(spell.classes ?? []),
        ...(fumbleSpellClasses.get(item.id) ?? []),
      ];
      const seenClasses = new Set<string>();
      const classes = classNames.flatMap((value) => {
        const localized =
          localizedFumbleClasses.get(canonicalClassFilterValue(value)) ?? value;
        const canonical = canonicalClassFilterValue(localized);
        if (seenClasses.has(canonical)) return [];
        seenClasses.add(canonical);
        return [localized];
      });
      return classes.length === (spell.classes ?? []).length &&
        classes.every((value, index) => value === spell.classes?.[index])
        ? item
        : ({ ...item, classes } as SpellEntry);
    };
    const selectedFumbleSubclass = fumbleCatalog.find(
      (item) => item.id === selectedId && item.isSubclass,
    );
    const selectedFumbleItem = fumbleCatalog.find(
      (item) => item.id === selectedId && !item.isSubclass,
    );
    const fumbleVisibility = {
      campaigns: compendiumCampaigns,
      categories: compendiumCategories,
    };
    const fumble = includeFumble
      ? fumbleCatalog
          .filter((item) => !item.isSubclass)
          .filter(
            (item) =>
              !showFumbleHomebrew ||
              !isFumbleHomebrew(item) ||
              fumbleItemMatchesVisibility(item, fumbleVisibility) ||
              item.id === selectedId,
          )
          .map((item) => {
            return category.id === 'spells' ? augmentFumbleSpell(item) : item;
          })
      : [];
    if (
      selectedFumbleItem &&
      includeFumble &&
      !fumble.some((item) => item.id === selectedFumbleItem.id)
    ) {
      fumble.push(
        category.id === 'spells'
          ? augmentFumbleSpell(selectedFumbleItem)
          : selectedFumbleItem,
      );
    }
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
          (!showFumbleHomebrew &&
            !isFumbleAlwaysVisible(item) &&
            !selectedFumbleSubclassIds.includes(item.id)) ||
          (showFumbleHomebrew &&
            isFumbleHomebrew(item) &&
            !fumbleItemMatchesVisibility(item, fumbleVisibility) &&
            !selectedFumbleSubclassIds.includes(item.id))
        )
          continue;
        subclassByClass.set(`${parentClassId}|${item.id}`, subclass);
      }
    }
    const mergedState = state.items.map((item) => {
      if (category.id === 'spells') return augmentFumbleSpell(item);
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
    const seenIds = new Set<string>();
    return [...hb, ...fumble, ...mergedState]
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [
    state.items,
    homebrew,
    category,
    locale,
    includeFumble,
    selectedId,
    selectedFumbleSubclassIds,
    showFumbleHomebrew,
    compendiumCampaigns,
    compendiumCategories,
  ]);

  return { status: state.status, items };
}
