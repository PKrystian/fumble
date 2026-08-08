import type { ClassSubclass } from '@/data/compendium/types';
import { slugify } from '@/data/transform/util';

export function subclassRouteKey(subclass: ClassSubclass): string {
  if (subclass.id) return subclass.id;
  return `${slugify(subclass.englishName ?? subclass.name)}-${slugify(subclass.source)}`;
}

export function findSubclassByRouteKey(
  subclasses: ClassSubclass[],
  routeKey: string | undefined,
): ClassSubclass | undefined {
  if (!routeKey) return undefined;
  return subclasses.find(
    (subclass) =>
      subclass.id === routeKey ||
      subclassRouteKey(subclass) === routeKey ||
      slugify(subclass.englishName ?? subclass.name) === routeKey ||
      slugify(subclass.name) === routeKey,
  );
}
