export const INITIATIVE_KEY = 'fumble-initiative';
export const INITIATIVE_VERSION = 2;

export interface Combatant {
  id: string;
  name: string;
  initiative: number | null;
  ac: number | null;
  hpCurrent: number | null;
  hpMax: number | null;
  conditions: string;
  isPlayer: boolean;
}

export type NewCombatant = Omit<Combatant, 'id'>;

export interface InitiativeData {
  combatants: Combatant[];
  round: number;
  turnId: string | null;
}

export function emptyInitiative(): InitiativeData {
  return { combatants: [], round: 0, turnId: null };
}

export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort(
    (a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity) || 0,
  );
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stat(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function readCombatant(value: unknown, legacy: boolean): Combatant | null {
  if (!record(value)) return null;
  const { id, name, initiative, ac, hpCurrent, hpMax, conditions, isPlayer } = value;
  if (
    typeof id !== 'string' ||
    !id.trim() ||
    typeof name !== 'string' ||
    !stat(initiative) ||
    !stat(ac) ||
    !stat(hpCurrent) ||
    !stat(hpMax) ||
    (legacy && (initiative === null || hpCurrent === null || hpMax === null)) ||
    typeof conditions !== 'string' ||
    typeof isPlayer !== 'boolean'
  )
    return null;
  return { id, name, initiative, ac, hpCurrent, hpMax, conditions, isPlayer };
}

export function readInitiative(value: unknown): InitiativeData | null {
  if (!record(value) || !record(value.state)) return null;
  const legacy = value.version === 1;
  if (!legacy && value.version !== INITIATIVE_VERSION) return null;
  const {
    combatants: rows = legacy ? [] : undefined,
    round = legacy ? 0 : undefined,
    turnId = legacy ? null : undefined,
  } = value.state;
  if (
    !Object.keys(value.state).every((key) =>
      ['combatants', 'round', 'turnId'].includes(key),
    ) ||
    !Array.isArray(rows) ||
    typeof round !== 'number' ||
    !Number.isSafeInteger(round) ||
    round < 0 ||
    (turnId !== null && (typeof turnId !== 'string' || round === 0))
  )
    return null;
  const combatants: Combatant[] = [];
  const ids = new Set<string>();
  for (const value of rows) {
    const row = readCombatant(value, legacy);
    if (!row || ids.has(row.id)) return null;
    ids.add(row.id);
    combatants.push(row);
  }
  if (turnId !== null && !ids.has(turnId)) return null;
  if (legacy) combatants.sort((a, b) => a.name.localeCompare(b.name));
  return { combatants, round, turnId };
}

export function parseStoredInitiative(raw: string): InitiativeData | null {
  try {
    return readInitiative(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function initiativeSnapshot({ combatants, round, turnId }: InitiativeData) {
  return { state: { combatants, round, turnId }, version: INITIATIVE_VERSION };
}

export function serializeInitiative(data: InitiativeData) {
  return JSON.stringify(initiativeSnapshot(data));
}
