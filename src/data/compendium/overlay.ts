import type { CompendiumEntryBase } from './types';
import { type CategoryOverlay, localizeItems } from './localize';

const overlayModules = import.meta.glob<{ default: CategoryOverlay }>(
  '../generated/*/*.json',
);

const overlayCache = new Map<string, Promise<CategoryOverlay | undefined>>();

export function loadCategoryOverlay(
  categoryId: string,
  locale: string,
): Promise<CategoryOverlay | undefined> {
  const cacheKey = `${locale}/${categoryId}`;
  const cached = overlayCache.get(cacheKey);
  if (cached) return cached;

  const suffix = `/${locale}/${categoryId}.json`;
  const key = Object.keys(overlayModules).find((k) => k.endsWith(suffix));
  const promise = key
    ? overlayModules[key]!().then((mod) => mod.default)
    : Promise.resolve(undefined);
  overlayCache.set(cacheKey, promise);
  return promise;
}

export async function loadLocalizedItems<T extends CompendiumEntryBase>(
  categoryId: string,
  load: () => Promise<T[]>,
  locale: string,
): Promise<T[]> {
  const [items, overlay] = await Promise.all([
    load(),
    loadCategoryOverlay(categoryId, locale),
  ]);
  return localizeItems(items, overlay);
}
