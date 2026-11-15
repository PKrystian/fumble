import type { CompendiumEntryBase } from '@/data/compendium/types';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { stripMarkup } from '@/data/transform/util';

const cache = new WeakMap<CompendiumEntryBase, string>();
const excluded = new Set([
  'id',
  'source',
  'type',
  'href',
  'image',
  'images',
  'token',
  '_filterData',
]);

function text(value: unknown): string {
  if (typeof value === 'string')
    return stripMarkup(value.replace(/\{@\w+ ([^|}]+)\|[^|}]*\|([^}]+)\}/g, '$1 $2'));
  if (Array.isArray(value)) return value.map(text).join(' ');
  if (value && typeof value === 'object')
    return Object.entries(value)
      .filter(([key]) => !excluded.has(key))
      .map(([, child]) => text(child))
      .join(' ');
  return '';
}

export function catalogSearchText(item: CompendiumEntryBase): string {
  const cached = cache.get(item);
  if (cached !== undefined) return cached;
  const result = normalizeSearchText(text(item)).replace(/\s+/g, ' ').trim();
  cache.set(item, result);
  return result;
}
