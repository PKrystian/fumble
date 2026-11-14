import type { CompendiumEntryBase, MonsterEntry } from '@/data/compendium/types';
import { canonicalHabitat } from '@/data/compendium/localizeValue';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { fixedStat, monsterInitiative } from '@/features/initiative/monsterCombatant';
import { XP_BY_CR, type Difficulty } from './xp';

export const ENCOUNTER_KEY = 'fumble-encounter';
export const ENCOUNTER_VERSION = 1;
export const ENCOUNTER_LIMIT = 50;
export const ENCOUNTER_COUNT_LIMIT = 999;
export const ENCOUNTER_GROUP_LIMIT = 50;
export const ENCOUNTER_ROSTER_LIMIT = 500;
export const ENCOUNTER_NAME_LIMIT = 120;
export const TRANSFER_LIMIT = 200;
export const DIFFICULTIES = ['low', 'moderate', 'high'] as const;
export const MISSING_HABITAT = 'missing';

export interface EncounterCreature {
  id: string;
  name: string;
  original: string;
  source: string;
  cr: string;
  xp: number | null;
  lairXp: number | null;
  ac: number | null;
  hp: number | null;
  initiative: number | null;
}

export interface EncounterMonster extends EncounterCreature {
  count: number;
  inLair: boolean;
}

interface PartyGroup {
  id: string;
  count: string;
  level: string;
}

export interface EncounterDraft {
  name: string;
  party: PartyGroup[];
  monsters: EncounterMonster[];
  target: Difficulty;
}

export interface SavedEncounter extends EncounterDraft {
  id: string;
}

export interface EncounterData {
  draft: EncounterDraft;
  selectedId: string | null;
  library: SavedEncounter[];
}

export function emptyEncounter(): EncounterDraft {
  return {
    name: '',
    party: [{ id: 'party', count: '4', level: '1' }],
    monsters: [],
    target: 'high',
  };
}

export function emptyEncounterData(): EncounterData {
  return { draft: emptyEncounter(), selectedId: null, library: [] };
}

export function partyNumber(value: string, max: number): number | null {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : null;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && value.length <= limit;
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const nullableInteger = (value: unknown, min: number, max: number) =>
  value === null || integer(value, min, max);
const id = (value: unknown): value is string => text(value, 512) && Boolean(value.trim());
const unique = (rows: { id: string }[]) =>
  new Set(rows.map((row) => row.id)).size === rows.length;

function isPartyGroup(value: unknown): value is PartyGroup {
  return record(value) && id(value.id) && text(value.count, 64) && text(value.level, 64);
}

function isMonster(value: unknown): value is EncounterMonster {
  return (
    record(value) &&
    id(value.id) &&
    text(value.name, 1024) &&
    Boolean(value.name.trim()) &&
    text(value.original, 1024) &&
    text(value.source, 512) &&
    text(value.cr, 16) &&
    nullableInteger(value.xp, 0, 1_000_000) &&
    nullableInteger(value.lairXp, 0, 1_000_000) &&
    nullableInteger(value.ac, 0, 1000) &&
    nullableInteger(value.hp, 0, 1_000_000) &&
    nullableInteger(value.initiative, -1000, 1000) &&
    integer(value.count, 1, ENCOUNTER_COUNT_LIMIT) &&
    typeof value.inLair === 'boolean' &&
    (!value.inLair || value.lairXp !== null)
  );
}

function isDraft(value: unknown): value is EncounterDraft {
  return (
    record(value) &&
    text(value.name, ENCOUNTER_NAME_LIMIT) &&
    DIFFICULTIES.some((key) => key === value.target) &&
    Array.isArray(value.party) &&
    value.party.length > 0 &&
    value.party.length <= ENCOUNTER_GROUP_LIMIT &&
    value.party.every(isPartyGroup) &&
    unique(value.party) &&
    Array.isArray(value.monsters) &&
    value.monsters.length <= ENCOUNTER_ROSTER_LIMIT &&
    value.monsters.every(isMonster) &&
    unique(value.monsters)
  );
}

function isSavedEncounter(value: unknown): value is SavedEncounter {
  return (
    record(value) &&
    id(value.id) &&
    isDraft(value) &&
    Boolean(value.name.trim()) &&
    value.party.every(
      (group) =>
        partyNumber(group.level, 20) && partyNumber(group.count, ENCOUNTER_COUNT_LIMIT),
    )
  );
}

export function isEncounterBackup(
  value: unknown,
): value is { state: EncounterData; version: typeof ENCOUNTER_VERSION } {
  if (!record(value) || value.version !== ENCOUNTER_VERSION || !record(value.state))
    return false;
  const { draft, library, selectedId } = value.state;
  return (
    isDraft(draft) &&
    Array.isArray(library) &&
    library.length <= ENCOUNTER_LIMIT &&
    library.every(isSavedEncounter) &&
    unique(library) &&
    (selectedId === null || library.some((item) => item.id === selectedId))
  );
}

export function parseStoredEncounter(raw: string) {
  try {
    const value: unknown = JSON.parse(raw);
    return isEncounterBackup(value) ? value.state : null;
  } catch {
    return null;
  }
}

export function monsterXp(monster: EncounterMonster) {
  return monster.inLair ? monster.lairXp : monster.xp;
}

const boundedStat = (value: number | null, min: number, max: number) =>
  integer(value, min, max) ? value : null;

function xpAmount(match: RegExpExecArray) {
  return boundedStat(Number(match[1]!.replace(/\D/g, '')), 0, 1_000_000);
}

export function encounterCreature(item: CompendiumEntryBase): EncounterCreature {
  const monster: Partial<MonsterEntry> = item;
  const cr = typeof monster.cr === 'string' ? monster.cr.trim() : '';
  const knownCr = Object.hasOwn(XP_BY_CR, cr);
  const original = typeof item.englishName === 'string' ? item.englishName : item.name;
  const crDisplay =
    typeof item._filterData?.crDisplay === 'string'
      ? item._filterData.crDisplay
      : typeof monster.crDisplay === 'string'
        ? monster.crDisplay
        : '';
  const xp = /\b(?:XP|PD)\s+(\d[\d, \u00a0\u202f]*)/i.exec(crDisplay);
  const lair =
    /\b(?:or|lub)\s+(\d[\d, \u00a0\u202f]*)\s+(?:in lair|w leżu|w legowisku)\b/i.exec(
      crDisplay,
    );
  return {
    id: item.id,
    name: item.name.slice(0, 1024),
    original: original.slice(0, 1024),
    source: item.source.slice(0, 512),
    cr: knownCr ? cr : '',
    xp: xp ? xpAmount(xp) : knownCr && cr !== '0' ? XP_BY_CR[cr]! : null,
    lairXp: lair ? xpAmount(lair) : null,
    ac: boundedStat(fixedStat(monster.ac), 0, 1000),
    hp: boundedStat(fixedStat(monster.hp), 0, 1_000_000),
    initiative: boundedStat(
      monsterInitiative(monster.initiative, monster.dex),
      -1000,
      1000,
    ),
  };
}

export function creatureHabitats(item: CompendiumEntryBase) {
  const monster: Partial<MonsterEntry> = item;
  const habitat = monster._englishHabitat ?? monster.habitat;
  if (typeof habitat !== 'string') return [];
  return [
    ...new Set(
      habitat
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part && part !== '-')
        .map(canonicalHabitat),
    ),
  ];
}

export function matchesCreatureHabitat(
  habitats: string[],
  habitat: string,
  includeAny: boolean,
) {
  if (!habitat) return true;
  if (habitat === MISSING_HABITAT) return habitats.length === 0;
  return habitats.includes(habitat) || (includeAny && habitats.includes('Any'));
}

export function creatureSearchNames(item: CompendiumEntryBase) {
  return normalizeSearchText(
    [item.name, item.englishName].filter((value) => typeof value === 'string').join('\n'),
  );
}
