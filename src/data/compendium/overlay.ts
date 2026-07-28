import type { CompendiumEntryBase } from './types';
import { type CategoryOverlay, localizeItems } from './localize';

const overlayUrls = import.meta.glob<string>('../generated/*/*.json', {
  eager: true,
  query: '?url',
  import: 'default',
});

const overlayCache = new Map<string, Promise<CategoryOverlay | undefined>>();

export function loadCategoryOverlay(
  categoryId: string,
  locale: string,
): Promise<CategoryOverlay | undefined> {
  const cacheKey = `${locale}/${categoryId}`;
  const cached = overlayCache.get(cacheKey);
  if (cached) return cached;

  const suffix = `/${locale}/${categoryId}.json`;
  const url = Object.entries(overlayUrls).find(([path]) => path.endsWith(suffix))?.[1];
  const promise = url
    ? fetch(url).then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load overlay: ${cacheKey}`);
        return (await response.json()) as CategoryOverlay;
      })
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
