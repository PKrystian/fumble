import {
  BOOK_READING_KEY,
  isBookSection,
  parseBookReading,
} from '@/features/books/readingData';
import { INITIATIVE_KEY, parseStoredInitiative } from '@/features/initiative/model';

export const ACTIVITY_CHARACTERS_KEY = 'fumble-characters';
export const ACTIVITY_SESSIONS_KEY = 'fumble-sessions';
export const ACTIVITY_ENCOUNTER_KEY = 'fumble-encounter';
export const ACTIVITY_HOMEBREW_KEY = 'fumble-homebrew';

const MAX_CHARACTERS = 3;
const MAX_ITEMS = 6;

export type RecentItem =
  | { kind: 'character'; id: string; name: string; level: number }
  | { kind: 'book'; id: string; chapter: number; section?: string }
  | { kind: 'session'; title: string }
  | { kind: 'initiative'; round: number; count: number }
  | { kind: 'encounter'; name: string; count: number };

export interface LocalActivity {
  items: RecentItem[];
  hasData: boolean;
  dataSince: number | null;
}

type Read = (key: string) => string | null;
type Stored = Record<string, unknown>;

function isRecord(value: unknown): value is Stored {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storedState(read: Read, key: string): Stored | null {
  const raw = read(key);
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) && isRecord(value.state) ? value.state : null;
  } catch {
    return null;
  }
}

function time(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function recentCharacters(read: Read): RecentItem[] {
  const characters = storedState(read, ACTIVITY_CHARACTERS_KEY)?.characters;
  if (!isRecord(characters)) return [];
  return Object.values(characters)
    .filter(
      (character): character is Stored & { id: string } =>
        isRecord(character) && typeof character.id === 'string' && character.id !== '',
    )
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
    .slice(0, MAX_CHARACTERS)
    .map((character) => ({
      kind: 'character',
      id: character.id,
      name: text(character.name),
      level: Number.isInteger(character.level) ? (character.level as number) : 1,
    }));
}

function recentBook(read: Read): RecentItem[] {
  const raw = read(BOOK_READING_KEY);
  const reading = raw === null ? undefined : parseBookReading(raw);
  const latest = Object.entries(reading?.positions ?? {}).sort(
    ([, a], [, b]) => b.updatedAt - a.updatedAt,
  )[0];
  if (!latest) return [];
  const [id, position] = latest;
  return [
    {
      kind: 'book',
      id,
      chapter: position.chapter,
      ...(isBookSection(position.section) ? { section: position.section } : {}),
    },
  ];
}

function recentSession(read: Read): RecentItem[] {
  const state = storedState(read, ACTIVITY_SESSIONS_KEY);
  const sessions = (Array.isArray(state?.sessions) ? state.sessions : []).filter(
    (session): session is Stored => isRecord(session) && typeof session.id === 'string',
  );
  const session =
    sessions.find((item) => item.id === state?.selectedSessionId) ??
    [...sessions].sort(
      (a, b) => time(b.updatedAt ?? b.createdAt) - time(a.updatedAt ?? a.createdAt),
    )[0];
  return session ? [{ kind: 'session', title: text(session.title) }] : [];
}

function recentInitiative(read: Read): RecentItem[] {
  const raw = read(INITIATIVE_KEY);
  const initiative = raw === null ? null : parseStoredInitiative(raw);
  return initiative && initiative.combatants.length > 0
    ? [
        {
          kind: 'initiative',
          round: initiative.round,
          count: initiative.combatants.length,
        },
      ]
    : [];
}

function recentEncounter(read: Read): RecentItem[] {
  const draft = storedState(read, ACTIVITY_ENCOUNTER_KEY)?.draft;
  if (!isRecord(draft) || !Array.isArray(draft.monsters) || draft.monsters.length === 0)
    return [];
  const count = draft.monsters.reduce(
    (sum: number, monster: unknown) =>
      sum +
      (isRecord(monster) &&
      Number.isInteger(monster.count) &&
      (monster.count as number) > 0
        ? (monster.count as number)
        : 1),
    0,
  );
  return [{ kind: 'encounter', name: text(draft.name), count }];
}

function dataSince(read: Read): number | null {
  const characters = storedState(read, ACTIVITY_CHARACTERS_KEY)?.characters;
  const sessions = storedState(read, ACTIVITY_SESSIONS_KEY)?.sessions;
  const times = [
    ...(isRecord(characters) ? Object.values(characters) : []),
    ...(Array.isArray(sessions) ? sessions : []),
  ]
    .map((item) => (isRecord(item) ? time(item.createdAt) : 0))
    .filter((created) => created > 0);
  return times.length > 0 ? Math.min(...times) : null;
}

function hasHomebrew(read: Read): boolean {
  const entries = storedState(read, ACTIVITY_HOMEBREW_KEY)?.entries;
  return Array.isArray(entries) && entries.length > 0;
}

export function readLocalActivity(read: Read = readStored): LocalActivity {
  const others = [
    ...recentBook(read),
    ...recentSession(read),
    ...recentInitiative(read),
    ...recentEncounter(read),
  ];
  const items = [
    ...recentCharacters(read).slice(0, MAX_ITEMS - others.length),
    ...others,
  ];
  return {
    items,
    hasData: items.length > 0 || hasHomebrew(read),
    dataSince: dataSince(read),
  };
}

export function recentBookPath(item: Extract<RecentItem, { kind: 'book' }>): string {
  const hash = item.section ? `#${new URLSearchParams({ section: item.section })}` : '';
  return `/books/${item.id}/${item.chapter}${hash}`;
}
