import {
  ABILITY_KEYS,
  LEGACY_SYNC,
  SYNCED_FIELDS,
  createCharacter,
  uid,
  type Character,
} from './model';

export const CHARACTERS_KEY = 'fumble-characters';
export const CHARACTER_VERSION = 3;
export const CHARACTER_FILE_APP = 'fumble-characters';
export const MAX_CHARACTER_FILE_BYTES = 10 * 1024 * 1024;

export interface CharacterCollection {
  characters: Record<string, Character>;
  order: string[];
}

type Check = (value: unknown) => boolean;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text: Check = (value) => typeof value === 'string';
const number: Check = (value) => typeof value === 'number' && Number.isFinite(value);
const boolean: Check = (value) => typeof value === 'boolean';
const optional =
  (check: Check): Check =>
  (value) =>
    value === undefined || check(value);
const nullable =
  (check: Check): Check =>
  (value) =>
    value === null || check(value);
const list =
  (check: Check): Check =>
  (value) =>
    Array.isArray(value) && value.every(check);
const oneOf =
  (...values: string[]): Check =>
  (value) =>
    typeof value === 'string' && values.includes(value);
const shape =
  (fields: Record<string, Check>): Check =>
  (value) =>
    isObject(value) && Object.entries(fields).every(([key, check]) => check(value[key]));

const ability = oneOf(...ABILITY_KEYS);
const named = { id: text, name: text, notes: text };

const characterFields: Record<string, Check> = {
  id: text,
  name: text,
  className: text,
  subclass: text,
  level: number,
  species: text,
  background: text,
  portrait: text,
  role: optional(oneOf('party', 'dm')),
  abilities: shape(Object.fromEntries(ABILITY_KEYS.map((key) => [key, number]))),
  savingThrowProficiencies: list(ability),
  skillProficiencies: list(text),
  skillExpertise: list(text),
  proficiencyBonusOverride: nullable(number),
  ac: number,
  acOverride: nullable(number),
  unarmoredDefense: nullable(
    shape({ base: number, abilities: list(ability), allowShield: boolean, source: text }),
  ),
  initiativeOverride: nullable(number),
  speed: shape({ walk: number, swim: number, climb: number, fly: number }),
  hp: shape({ current: number, max: number, temp: number }),
  hitDice: text,
  hitDiceUsed: number,
  deathSaves: shape({ successes: number, failures: number }),
  inspiration: boolean,
  spellcastingAbility: nullable(ability),
  spellSlots: list(
    shape({
      level: number,
      longRestMax: number,
      usedLongRest: number,
      shortRestMax: number,
      usedShortRest: number,
    }),
  ),
  spells: list(
    shape({
      id: text,
      name: text,
      level: number,
      prepared: boolean,
      auto: optional(boolean),
      source: optional(text),
      spellId: optional(text),
      concentration: optional(boolean),
    }),
  ),
  autoSyncFeatures: boolean,
  syncSignature: text,
  manualFields: list(oneOf(...SYNCED_FIELDS)),
  currency: shape({ cp: number, sp: number, ep: number, gp: number, pp: number }),
  actions: list(shape(named)),
  inventory: list(
    shape({
      ...named,
      quantity: number,
      itemId: optional(text),
      armorType: optional(oneOf('light', 'medium', 'heavy', 'shield')),
      baseAc: optional(number),
      equipped: optional(boolean),
    }),
  ),
  features: list(
    shape({ ...named, source: text, auto: optional(boolean), featId: optional(text) }),
  ),
  weaponProficiencies: text,
  armorProficiencies: text,
  toolProficiencies: text,
  languages: text,
  defenses: text,
  conditions: text,
  concentration: text,
  notes: text,
  createdAt: number,
  updatedAt: number,
};

const isCharacter = shape(characterFields);

export function readCharacter(value: unknown): Character | null {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id.trim()) return null;
  const defaults = createCharacter(typeof value.name === 'string' ? value.name : '');
  const merged: Record<string, unknown> = {
    ...defaults,
    syncSignature: LEGACY_SYNC,
    createdAt: defaults.createdAt,
    updatedAt: defaults.updatedAt,
  };
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && Object.hasOwn(characterFields, key)) merged[key] = item;
  }
  return isCharacter(merged) ? (merged as unknown as Character) : null;
}

export function isStoredCharacter(value: unknown): boolean {
  return readCharacter(value) !== null;
}

export function readCharacterCollection(value: unknown): CharacterCollection | null {
  if (!isObject(value)) return null;
  const state = isObject(value.state) ? value.state : null;
  const version = value.version ?? 0;
  if (!state || typeof version !== 'number' || !Number.isInteger(version)) return null;
  if (version < 0 || version > CHARACTER_VERSION) return null;
  if (Object.keys(state).some((key) => key !== 'characters' && key !== 'order'))
    return null;
  const rawCharacters = state.characters ?? {};
  const rawOrder = state.order ?? [];
  if (!isObject(rawCharacters) || !list(text)(rawOrder)) return null;
  const characters: Record<string, Character> = {};
  for (const [key, item] of Object.entries(rawCharacters)) {
    const character = readCharacter(item);
    if (!character || character.id !== key) return null;
    characters[key] = character;
  }
  const order = [...new Set(rawOrder as string[])].filter((id) => characters[id]);
  for (const id of Object.keys(characters)) if (!order.includes(id)) order.push(id);
  return { characters, order };
}

export function parseStoredCharacters(raw: string): CharacterCollection | null {
  try {
    return readCharacterCollection(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializeCharacters({ characters, order }: CharacterCollection): string {
  return JSON.stringify({ state: { characters, order }, version: CHARACTER_VERSION });
}

export function emptyCharacters(): CharacterCollection {
  return { characters: {}, order: [] };
}

export interface CharacterFile {
  kind: 'character' | 'collection' | 'backup';
  characters: Character[];
  layout: unknown;
  exportedAt: string | null;
  version: number;
}

export function characterFileText(characters: Character[], layout?: unknown): string {
  const text = JSON.stringify(
    {
      app: CHARACTER_FILE_APP,
      version: 2,
      exportedAt: new Date().toISOString(),
      characters,
      ...(layout === undefined ? {} : { layout }),
    },
    null,
    2,
  );
  if (new Blob([text]).size > MAX_CHARACTER_FILE_BYTES)
    throw new Error('character-file-too-large');
  return text;
}

function validDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

export function parseCharacterFile(text: string): CharacterFile {
  if (new Blob([text]).size > MAX_CHARACTER_FILE_BYTES)
    throw new Error('character-file-too-large');
  const file = JSON.parse(text) as unknown;
  if (!isObject(file)) throw new Error('character-file-invalid');
  if (file.app === 'fumble') {
    const data = isObject(file.data) ? file.data : null;
    const raw = data?.[CHARACTERS_KEY];
    if (typeof raw !== 'string') throw new Error('character-file-empty');
    const collection = parseStoredCharacters(raw);
    if (!collection) throw new Error('character-file-invalid');
    const layout = data?.['fumble-sheet-layout'];
    return {
      kind: 'backup',
      characters: collection.order.map((id) => collection.characters[id]!),
      layout: typeof layout === 'string' ? safeJson(layout) : undefined,
      exportedAt: validDate(file.exportedAt),
      version: typeof file.version === 'number' ? file.version : 1,
    };
  }
  if (file.app === CHARACTER_FILE_APP) {
    if (!Array.isArray(file.characters)) throw new Error('character-file-invalid');
    const characters = file.characters.map(readCharacter);
    if (characters.some((character) => !character))
      throw new Error('character-file-invalid');
    return {
      kind: 'collection',
      characters: characters as Character[],
      layout: file.layout,
      exportedAt: validDate(file.exportedAt),
      version: typeof file.version === 'number' ? file.version : 2,
    };
  }
  const character = readCharacter(file.character ?? file);
  if (!character) throw new Error('character-file-invalid');
  return {
    kind: 'character',
    characters: [character],
    layout: file.character ? file.layout : undefined,
    exportedAt: validDate(file.exportedAt),
    version: typeof file.version === 'number' ? file.version : 1,
  };
}

function safeJson(text: string): unknown {
  try {
    const value = JSON.parse(text) as unknown;
    return isObject(value) ? value.state : undefined;
  } catch {
    return undefined;
  }
}

export function copyCharacter(character: Character, name: string): Character {
  const now = Date.now();
  return {
    ...structuredClone(character),
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export function safeFilename(name: string, fallback: string): string {
  const cleaned = [...name.normalize('NFC')]
    .map((char) => (char.charCodeAt(0) < 32 ? ' ' : char))
    .join('')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}
