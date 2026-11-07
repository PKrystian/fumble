import type { Locale } from '../../i18n/locales';
import type { MonsterEntry } from './types';

export interface MonsterSnapshot {
  path: string;
  item: MonsterEntry;
  indexable: boolean;
  locales: Locale[];
  canonicalPath?: string;
}

export function readMonsterSnapshot(
  json: string | null | undefined,
  pathname: string,
): MonsterSnapshot | undefined {
  if (!json) return undefined;
  try {
    const snapshot = JSON.parse(json) as MonsterSnapshot;
    return snapshot?.path === `${pathname.replace(/\/+$/, '')}/` && snapshot.item
      ? snapshot
      : undefined;
  } catch {
    return undefined;
  }
}
