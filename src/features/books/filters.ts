import type { BookIndexEntry } from '@/data/compendium/types';

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const CORE_SOURCE_RANK: Record<string, number> = {
  XPHB: 0,
  PHB: 0,
  XDMG: 1,
  DMG: 1,
  XMM: 2,
  MM: 2,
};

export function typeLabel(group: string, t: TranslateFn): string {
  const key = `books.types.${group}`;
  const value = t(key);
  return value === key ? group : value;
}

export function sortDocs(docs: BookIndexEntry[]): BookIndexEntry[] {
  return [...docs].sort((a, b) => {
    const ra = CORE_SOURCE_RANK[a.source] ?? 99;
    const rb = CORE_SOURCE_RANK[b.source] ?? 99;
    if (ra !== rb) return ra - rb;
    const dateDiff = (b.published ?? '').localeCompare(a.published ?? '');
    return dateDiff !== 0 ? dateDiff : a.name.localeCompare(b.name);
  });
}
