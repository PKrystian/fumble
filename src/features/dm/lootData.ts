import type { ContentMode } from '@/features/ui/contentModeStore';
import type { LootCharacter } from './loot';

export const LOOT_KEY = 'fumble-loot';
export const LOOT_VERSION = 1;
export const LOOT_HISTORY_LIMIT = 50;
export const MAX_PARTY_COUNT = 1000;

export type LootMode = 'party' | 'tier' | 'wildcard';
export type LootReward = 'minor' | 'major' | 'hoard' | 'wildcard';
export interface LootGroup {
  id: string;
  count: string;
  level: string;
}
export interface LootSettings {
  mode: LootMode;
  source: 'manual' | 'saved';
  tierId: number;
  wildcardTierId: number;
  groups: LootGroup[];
  selectedIds: string[] | null;
  search: string;
  role: 'party' | 'dm' | 'all';
  sort: 'name' | 'level';
  includeUnknown: boolean;
}
export interface LootItem {
  id: string;
  name: string;
  source: string;
  type: string;
  rarity: string;
  attunement: string;
  weaponCategory?: string;
}
export interface LootResultItem {
  item: LootItem;
  baseIds: string[];
  base: LootItem | null;
}
export interface LootContext {
  mode: LootMode;
  reward: LootReward;
  tierId: number;
  partySize: number;
  partyLevel: number;
  party: LootCharacter[];
  edition: ContentMode;
  includeUnknown: boolean;
}
export interface LootResult {
  id: string;
  name: string;
  createdAt: number;
  context: LootContext;
  gold: number;
  gemCount: number;
  gemValue: number;
  items: LootResultItem[];
  splitCount: string;
  splitEnabled: boolean;
}
export interface LootData {
  settings: LootSettings;
  history: LootResult[];
  selectedId: string | null;
}

export function emptyLootData(): LootData {
  return {
    settings: {
      mode: 'party',
      source: 'manual',
      tierId: 1,
      wildcardTierId: 1,
      groups: [{ id: 'initial-party', count: '4', level: '1' }],
      selectedIds: null,
      search: '',
      role: 'party',
      sort: 'name',
      includeUnknown: false,
    },
    history: [],
    selectedId: null,
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const tier = (value: unknown) => integer(value) && value >= 1 && value <= 4;
const level = (value: unknown) => integer(value) && value >= 1 && value <= 20;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const identified = (value: unknown): value is Record<string, unknown> =>
  record(value) && text(value.id) && value.id.trim().length > 0;
const unique = (values: Array<{ id?: unknown }>) =>
  new Set(values.map((value) => value.id)).size === values.length;
const oneOf = (value: unknown, choices: string[]) =>
  typeof value === 'string' && choices.includes(value);

export function isLootSettings(value: unknown): value is LootSettings {
  if (!record(value)) return false;
  return (
    oneOf(value.mode, ['party', 'tier', 'wildcard']) &&
    oneOf(value.source, ['manual', 'saved']) &&
    tier(value.tierId) &&
    tier(value.wildcardTierId) &&
    Array.isArray(value.groups) &&
    value.groups.length > 0 &&
    value.groups.every(
      (group) => identified(group) && text(group.count) && text(group.level),
    ) &&
    unique(value.groups) &&
    (value.selectedIds === null || strings(value.selectedIds)) &&
    text(value.search) &&
    oneOf(value.role, ['party', 'dm', 'all']) &&
    oneOf(value.sort, ['name', 'level']) &&
    typeof value.includeUnknown === 'boolean'
  );
}

export function isLootItem(value: unknown): value is LootItem {
  return (
    identified(value) &&
    ['name', 'source', 'type', 'rarity', 'attunement'].every((key) => text(value[key])) &&
    (value.weaponCategory === undefined || text(value.weaponCategory))
  );
}

export function isLootContext(value: unknown): value is LootContext {
  if (!record(value) || !Array.isArray(value.party)) return false;
  return (
    oneOf(value.mode, ['party', 'tier', 'wildcard']) &&
    oneOf(value.reward, ['minor', 'major', 'hoard', 'wildcard']) &&
    ((value.mode === 'party' && (value.reward === 'minor' || value.reward === 'major')) ||
      (value.mode === 'tier' && value.reward === 'hoard') ||
      (value.mode === 'wildcard' && value.reward === 'wildcard')) &&
    tier(value.tierId) &&
    integer(value.partySize) &&
    level(value.partyLevel) &&
    value.party.every(
      (member) =>
        identified(member) &&
        text(member.name) &&
        level(member.level) &&
        ['className', 'armorProficiencies', 'weaponProficiencies'].every((key) =>
          text(member[key]),
        ),
    ) &&
    unique(value.party) &&
    oneOf(value.edition, ['all', '2014', '2024']) &&
    typeof value.includeUnknown === 'boolean'
  );
}

export function isLootResult(value: unknown): value is LootResult {
  return (
    identified(value) &&
    text(value.name) &&
    integer(value.createdAt) &&
    Number.isFinite(new Date(value.createdAt).getTime()) &&
    isLootContext(value.context) &&
    integer(value.gold) &&
    integer(value.gemCount) &&
    integer(value.gemValue) &&
    Number.isSafeInteger((value.gold + value.gemCount * value.gemValue) * 100) &&
    Array.isArray(value.items) &&
    value.items.length <= 4 &&
    value.items.every(
      (row) =>
        record(row) &&
        isLootItem(row.item) &&
        strings(row.baseIds) &&
        (row.base === null ||
          (isLootItem(row.base) && row.baseIds.includes(row.base.id))),
    ) &&
    text(value.splitCount) &&
    typeof value.splitEnabled === 'boolean'
  );
}

export function isLootData(value: unknown): value is LootData {
  return (
    record(value) &&
    isLootSettings(value.settings) &&
    Array.isArray(value.history) &&
    value.history.length <= LOOT_HISTORY_LIMIT &&
    value.history.every(isLootResult) &&
    unique(value.history) &&
    (value.selectedId === null ||
      (text(value.selectedId) &&
        value.history.some((result) => result.id === value.selectedId)))
  );
}

export function isLootBackup(
  value: unknown,
): value is { state: LootData; version: number } {
  return record(value) && value.version === LOOT_VERSION && isLootData(value.state);
}

export function validPartyNumber(value: string, maximum: number): boolean {
  return (
    value.trim() !== '' &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= 1 &&
    Number(value) <= maximum
  );
}
