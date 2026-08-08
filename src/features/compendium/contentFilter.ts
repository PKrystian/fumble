import type { CompendiumEntryBase } from '@/data/compendium/types';
import { sourceEdition, sourceRank } from '@/data/compendium/sources';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import { isFumbleHomebrew } from '@/features/homebrew/fumbleHomebrew';
import type { ContentMode } from '@/features/ui/contentModeStore';

function alwaysShown(source: string): boolean {
  return source === HOMEBREW_SOURCE;
}

export function applyContentMode<T extends CompendiumEntryBase>(
  items: T[],
  mode: ContentMode,
  showFumbleHomebrew = false,
): T[] {
  const visible = items.filter(
    (item) => !item.hidden && (showFumbleHomebrew || !isFumbleHomebrew(item)),
  );
  if (mode === 'all') return visible;

  if (mode === '2024') {
    return visible.filter(
      (item) =>
        alwaysShown(item.source) ||
        (showFumbleHomebrew && isFumbleHomebrew(item)) ||
        sourceEdition(item.source) === '2024',
    );
  }

  const byId = new Map(items.map((item) => [item.id, item] as const));
  const result: T[] = [];
  for (const item of visible) {
    if (
      alwaysShown(item.source) ||
      (showFumbleHomebrew && isFumbleHomebrew(item)) ||
      sourceEdition(item.source) === '2014'
    ) {
      result.push(item);
      continue;
    }
    const alt = (item.otherVersions ?? [])
      .filter((version) => sourceEdition(version.source) === '2014')
      .sort((a, b) => sourceRank(b.source) - sourceRank(a.source))[0];
    if (alt) {
      const found = byId.get(alt.id);
      if (found) result.push(found);
    }
  }
  return result;
}
