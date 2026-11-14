import {
  HOMEBREW_KEY,
  HOMEBREW_VERSION,
  readHomebrewSnapshot,
} from '@/features/homebrew/store';
import { isCustomRoll, isRollLogEntry } from '@/features/dice/validation';
import { isSoundboardBackup } from '@/features/soundboard/validation';
import { isLootBackup, LOOT_KEY } from '@/features/dm/lootData';
import { ENCOUNTER_KEY, isEncounterBackup } from '@/features/dm/encounterModel';
import {
  INITIATIVE_KEY,
  INITIATIVE_VERSION,
  readInitiative,
} from '@/features/initiative/model';
import { BACKUP_REMINDER_KEY, BACKUP_REMINDER_VERSION } from './backupReminder';

type Validator = (value: unknown) => boolean;
type Fields = Record<string, Validator>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text: Validator = (value) => typeof value === 'string';
const number: Validator = (value) => typeof value === 'number' && Number.isFinite(value);
const timestamp: Validator = (value) =>
  number(value) && Number.isFinite(new Date(value as number).getTime());
const calendarDate: Validator = (value) =>
  typeof value === 'string' &&
  (value === '' ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value));
const boolean: Validator = (value) => typeof value === 'boolean';
const optional =
  (validate: Validator): Validator =>
  (value) =>
    value === undefined || validate(value);
const nullable =
  (validate: Validator): Validator =>
  (value) =>
    value === null || validate(value);
const list =
  (validate: Validator): Validator =>
  (value) =>
    Array.isArray(value) && value.every(validate);
const choice =
  (...values: string[]): Validator =>
  (value) =>
    typeof value === 'string' && values.includes(value);
const record =
  (validate: Validator): Validator =>
  (value) =>
    isRecord(value) && Object.values(value).every(validate);
const shape =
  (fields: Fields): Validator =>
  (value) =>
    isRecord(value) &&
    Object.entries(fields).every(([key, validate]) => validate(value[key]));

const strings = list(text);
const session = (notes: Validator) =>
  list(
    shape({
      id: text,
      title: text,
      createdAt: timestamp,
      durationMs: number,
      updatedAt: optional(timestamp),
      campaign: optional(text),
      sessionDate: optional(calendarDate),
      number: optional(text),
      summary: optional(text),
      contextIds: optional(strings),
      notes,
      entries: list(
        shape({ id: optional(text), time: timestamp, text, offsetMs: optional(number) }),
      ),
    }),
  );

const schemas: Record<
  string,
  { version: number; migrate?: boolean; fields: Fields; legacyFields?: Fields }
> = {
  [CHARACTERS_KEY]: {
    version: CHARACTER_VERSION,
    migrate: true,
    fields: { characters: record(isStoredCharacter), order: strings },
  },
  'fumble-sessions': {
    version: 4,
    migrate: true,
    legacyFields: { sessions: session(optional(text)) },
    fields: {
      sessions: session(text),
      transcriptionLang: text,
      transcriptionMode: choice('auto', 'browser', 'local'),
      selectedSessionId: nullable(text),
      contexts: list(
        shape({ id: text, name: text, text, createdAt: number, updatedAt: number }),
      ),
    },
  },
  'fumble-soundboard': { version: 6, migrate: true, fields: {} },
  'fumble-custom-rolls': {
    version: 1,
    migrate: true,
    fields: { customRolls: list(isCustomRoll) },
  },
  'fumble-roll-history': {
    version: 1,
    fields: {
      log: (value) =>
        Array.isArray(value) && value.length <= 50 && value.every(isRollLogEntry),
    },
  },
  'fumble-sheet-layout': {
    version: 2,
    migrate: true,
    fields: {
      zones: shape({ left: strings, center: strings, right: strings }),
      mobileOrder: optional(strings),
      collapsed: optional(strings),
    },
  },
  [BACKUP_REMINDER_KEY]: {
    version: BACKUP_REMINDER_VERSION,
    fields: { lastBackupAt: nullable(timestamp), snoozedUntil: nullable(timestamp) },
  },
  'fumble-locale': { version: 1, fields: { locale: choice('en', 'pl') } },
  'fumble-sidebar': { version: 1, fields: { collapsed: boolean } },
  'fumble-content-mode': { version: 1, fields: { mode: choice('all', '2014', '2024') } },
  'fumble-homebrew-visibility': {
    version: 2,
    migrate: true,
    fields: {
      showInCompendium: boolean,
      compendiumCampaigns: nullable(strings),
      compendiumCategories: nullable(strings),
    },
  },
};

export function validateBackupEntry(key: string, value: unknown): void {
  if (key === HOMEBREW_KEY) {
    if (
      isRecord(value) &&
      typeof value.version === 'number' &&
      value.version > HOMEBREW_VERSION
    )
      throw new Error('backup-version');
    if (!readHomebrewSnapshot(value)) throw new Error('backup-invalid-data');
    return;
  }
  if (key === BOOK_READING_KEY) {
    if (!readBookReading(value)) throw new Error('backup-invalid-data');
    return;
  }
  if (key === INITIATIVE_KEY) {
    if (
      isRecord(value) &&
      typeof value.version === 'number' &&
      Number.isInteger(value.version) &&
      value.version >= 0 &&
      value.version !== 1 &&
      value.version !== INITIATIVE_VERSION
    )
      throw new Error('backup-version');
    if (!readInitiative(value)) throw new Error('backup-invalid-data');
    return;
  }
  if (key === ENCOUNTER_KEY) {
    if (!isEncounterBackup(value)) throw new Error('backup-invalid-data');
    return;
  }
  if (key === LOOT_KEY) {
    if (!isLootBackup(value)) throw new Error('backup-invalid-data');
    return;
  }
  if (key.startsWith('fumble-campaign-map-editor:')) {
    if (
      !list((cell) => number(cell) && Number.isInteger(cell) && (cell as number) >= 0)(
        value,
      )
    ) {
      throw new Error('backup-invalid-data');
    }
    return;
  }
  const schema = schemas[key];
  if (!schema) return;
  if (
    !isRecord(value) ||
    !isRecord(value.state) ||
    !Number.isInteger(value.version) ||
    (value.version as number) < 0
  ) {
    throw new Error('backup-invalid-data');
  }
  if (
    (value.version as number) > schema.version ||
    (value.version !== schema.version && !schema.migrate)
  )
    throw new Error('backup-version');
  const state = value.state;
  if (key === 'fumble-soundboard') {
    if (!isSoundboardBackup(value)) throw new Error('backup-invalid-data');
    return;
  }
  const fields =
    value.version === schema.version
      ? schema.fields
      : { ...schema.fields, ...schema.legacyFields };
  if (
    !Object.keys(state).every(
      (field) => Object.hasOwn(fields, field) && fields[field]!(state[field]),
    )
  ) {
    throw new Error('backup-invalid-data');
  }
}
import { BOOK_READING_KEY, readBookReading } from '@/features/books/readingData';
import {
  CHARACTER_VERSION,
  CHARACTERS_KEY,
  isStoredCharacter,
} from '@/features/character/characterData';
