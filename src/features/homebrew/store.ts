import { create } from 'zustand';
import type { Entry } from '@/data/compendium/entry';
import type {
  ClassFeature,
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import { isUaSource } from '@/data/compendium/sources';
import { classIdForName } from '@/features/compendium/classNames';
import {
  canRenderHomebrew,
  isHomebrewDescription,
  isHomebrewFeature,
} from './validateImported';

export interface HomebrewTranslation {
  name: string;
  subtitle: string;
  body: string;
}

export interface HomebrewManualEntry {
  kind: 'manual';
  id: string;
  category: CompendiumCategoryId;
  name: string;

  subtitle: string;

  body: string;

  image?: string;
  createdAt: number;

  translations?: Partial<Record<Locale, HomebrewTranslation>>;
}

export interface HomebrewImportedEntry {
  kind: 'imported';
  id: string;
  category: CompendiumCategoryId;
  name: string;

  ua?: boolean;
  baseLocale: Locale;

  data: CompendiumEntryBase & Record<string, unknown>;
  translations?: Partial<Record<Locale, CompendiumEntryBase & Record<string, unknown>>>;
  createdAt: number;
}

export interface HomebrewSubclassEntry {
  kind: 'subclass';
  id: string;

  className: string;
  parentClassId?: string;
  subclass: ClassSubclass;
  createdAt: number;
}

export type HomebrewEntry =
  HomebrewManualEntry | HomebrewImportedEntry | HomebrewSubclassEntry;

export type HomebrewCompendiumItem = CompendiumEntryBase & {
  _homebrew: true;

  _manual: boolean;
  subtitle: string;
  entries: Entry[];
} & Record<string, unknown>;

export const HOMEBREW_SOURCE = 'Homebrew';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function makeId(name: string): string {
  const base = slugify(name).slice(0, 80) || 'entry';
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return `hb-${base}-${suffix}`;
}

const VALID_CATEGORIES = new Set<CompendiumCategoryId>([
  'spells',
  'firearms',
  'conditions',
  'species',
  'feats',
  'backgrounds',
  'rules',
  'items',
  'classes',
  'bestiary',
  'actions',
  'optionalfeatures',
  'deities',
  'hazards',
  'boons',
  'skills',
  'senses',
  'languages',
  'cultsboons',
  'facilities',
  'recipes',
  'objects',
  'vehicles',
  'masteries',
  'charoptions',
  'tables',
  'decks',
  'psionics',
  'encounters',
  'loot',
  'life',
  'names',
  'monsterfeatures',
  'homecrafts',
]);

export const HOMEBREW_KEY = 'fumble-homebrew';
export const HOMEBREW_VERSION = 4;
export const MAX_HOME_BREW_TEXT = 250_000;
export const MAX_HOME_BREW_ENTRY_BYTES = 512_000;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyText(value: unknown): value is string {
  return isText(value) && value.trim().length > 0;
}

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pl';
}

export function isHomebrewCategory(value: unknown): value is CompendiumCategoryId {
  return typeof value === 'string' && VALID_CATEGORIES.has(value as CompendiumCategoryId);
}

export function fitsEntryLimit(value: unknown): boolean {
  try {
    return JSON.stringify(value).length <= MAX_HOME_BREW_ENTRY_BYTES;
  } catch {
    return false;
  }
}

function isTranslation(value: unknown): value is HomebrewTranslation {
  return (
    isRecord(value) && isText(value.name) && isText(value.subtitle) && isText(value.body)
  );
}

function isManualEntry(value: unknown): value is HomebrewManualEntry {
  if (!isRecord(value)) return false;
  if (
    value.kind !== 'manual' ||
    !isNonEmptyText(value.id) ||
    !isHomebrewCategory(value.category) ||
    !isNonEmptyText(value.name) ||
    !isText(value.subtitle) ||
    !isText(value.body) ||
    !Number.isFinite(value.createdAt)
  )
    return false;
  if (value.image !== undefined && !isText(value.image)) return false;
  if (value.translations !== undefined) {
    if (!isRecord(value.translations)) return false;
    for (const [locale, translation] of Object.entries(value.translations)) {
      if (!isLocale(locale) || !isTranslation(translation)) return false;
    }
  }
  return true;
}

export function isImportedData(
  value: unknown,
): value is CompendiumEntryBase & Record<string, unknown> {
  return (
    isRecord(value) &&
    (value.id === undefined || typeof value.id === 'string') &&
    isNonEmptyText(value.name) &&
    (value.source == null || isText(value.source))
  );
}

function isStoredImportedData(value: unknown) {
  return isRecord(value) && isNonEmptyText(value.name);
}

function isImportedEntry(value: unknown): value is HomebrewImportedEntry {
  if (!isRecord(value)) return false;
  if (
    value.kind !== 'imported' ||
    !isNonEmptyText(value.id) ||
    !isHomebrewCategory(value.category) ||
    !isNonEmptyText(value.name) ||
    !isLocale(value.baseLocale) ||
    !Number.isFinite(value.createdAt) ||
    !isStoredImportedData(value.data)
  )
    return false;
  if (value.ua !== undefined && typeof value.ua !== 'boolean') return false;
  if (value.translations !== undefined) {
    if (!isRecord(value.translations)) return false;
    for (const [locale, translation] of Object.entries(value.translations)) {
      if (!isLocale(locale) || !isStoredImportedData(translation)) return false;
    }
  }
  return true;
}

function isSubclassEntry(value: unknown): value is HomebrewSubclassEntry {
  if (!isRecord(value)) return false;
  return (
    value.kind === 'subclass' &&
    isNonEmptyText(value.id) &&
    isNonEmptyText(value.className) &&
    isRecord(value.subclass) &&
    isNonEmptyText(value.subclass.name) &&
    isNonEmptyText(value.subclass.source) &&
    Array.isArray(value.subclass.features) &&
    (value.parentClassId === undefined || isNonEmptyText(value.parentClassId)) &&
    Number.isFinite(value.createdAt)
  );
}

export function isSafeHomebrewEntry(value: unknown): value is HomebrewEntry {
  return isManualEntry(value) || isImportedEntry(value) || isSubclassEntry(value);
}

export function bodyToEntries(body: string): Entry[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function homebrewToItem(
  entry: HomebrewManualEntry | HomebrewImportedEntry,
  locale?: Locale,
  entries: HomebrewEntry[] = [],
): HomebrewCompendiumItem {
  if (entry.kind === 'manual') {
    const translation = locale ? entry.translations?.[locale] : undefined;
    const name = translation?.name.trim() || entry.name;
    const subtitle = translation?.subtitle.trim() || entry.subtitle.trim();
    const body = translation?.body.trim() || entry.body;
    return {
      id: entry.id,
      name,
      ...(name !== entry.name ? { englishName: entry.name } : {}),
      source: HOMEBREW_SOURCE,
      srd: false,
      _homebrew: true,
      _manual: true,
      subtitle,
      entries: bodyToEntries(body),
      ...(entry.image ? { image: entry.image } : {}),
    };
  }
  const translation =
    locale && locale !== entry.baseLocale ? entry.translations?.[locale] : undefined;
  const data = translation ? { ...entry.data, ...translation } : entry.data;
  const renderable = canRenderHomebrew(entry.category, data);
  const spellAvailability =
    entry.category === 'spells'
      ? inferSpellAvailability(entry, data, entries, locale)
      : {};
  return {
    ...(renderable ? data : typeof data.image === 'string' ? { image: data.image } : {}),
    ...spellAvailability,
    id: entry.id,
    name: data.name,
    ...(data.name !== entry.name ? { englishName: entry.name } : {}),
    source: HOMEBREW_SOURCE,
    srd: false,
    _homebrew: true,
    _manual: !renderable,
    ...(entry.ua ? { ua: true } : {}),
    subtitle: '',
    entries: Array.isArray(data.entries)
      ? data.entries.filter((node) => isHomebrewDescription(node))
      : [],
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))];
}

function importedName(entry: HomebrewImportedEntry, locale?: Locale): string {
  if (!locale || locale === entry.baseLocale) return entry.name;
  return entry.translations?.[locale]?.name || entry.name;
}

function inferSpellAvailability(
  spell: HomebrewImportedEntry,
  data: CompendiumEntryBase & Record<string, unknown>,
  entries: HomebrewEntry[],
  locale?: Locale,
): Pick<HomebrewCompendiumItem, 'classes' | 'subclasses'> {
  const source = spell.data.source;
  if (typeof source !== 'string' || !source) {
    return {
      classes: unique(Array.isArray(data.classes) ? (data.classes as string[]) : []),
      subclasses: unique(
        Array.isArray(data.subclasses) ? (data.subclasses as string[]) : [],
      ),
    };
  }

  const inferredClasses = entries
    .filter(
      (candidate): candidate is HomebrewImportedEntry =>
        candidate.kind === 'imported' &&
        candidate.category === 'classes' &&
        candidate.data.source === source,
    )
    .map((candidate) => importedName(candidate, locale));
  const inferredSubclasses = entries
    .filter(
      (candidate): candidate is HomebrewSubclassEntry =>
        candidate.kind === 'subclass' && candidate.subclass.source === source,
    )
    .map((candidate) => `${candidate.className}: ${candidate.subclass.name}`);

  return {
    classes: unique([
      ...(Array.isArray(data.classes) ? (data.classes as string[]) : []),
      ...inferredClasses,
    ]),
    subclasses: unique([
      ...(Array.isArray(data.subclasses) ? (data.subclasses as string[]) : []),
      ...inferredSubclasses,
    ]),
  };
}

export function isHomebrew(item: CompendiumEntryBase): item is HomebrewCompendiumItem {
  return (item as Partial<HomebrewCompendiumItem>)._homebrew === true;
}

export interface ManualInput {
  category: CompendiumCategoryId;
  name: string;
  subtitle: string;
  body: string;
  image?: string;
  translations?: Partial<Record<Locale, HomebrewTranslation>>;
}

export interface SubclassInput {
  className: string;
  parentClassId?: string;
  name: string;
  source: string;
  body?: string;
  features?: ClassFeature[];
}

const SUBCLASS_FEATURE_LEVEL = 3;

export type HomebrewSaveStatus = 'saved' | 'unsaved' | 'unreadable' | 'conflict';

type ImportedPatch = Partial<
  Pick<
    HomebrewImportedEntry,
    'category' | 'name' | 'baseLocale' | 'data' | 'translations' | 'ua'
  >
>;

interface HomebrewState {
  entries: HomebrewEntry[];
  status: HomebrewSaveStatus;
  dirty: boolean;
  raw: string | null;
  deleted: { entry: HomebrewEntry; index: number } | null;
  addManual: (input: ManualInput) => string;
  updateManual: (id: string, patch: Partial<ManualInput>) => boolean;
  updateImported: (id: string, patch: ImportedPatch) => boolean;
  addSubclass: (input: SubclassInput) => string;
  updateSubclass: (id: string, input: SubclassInput) => boolean;
  addImported: (
    list: Array<{ category: CompendiumCategoryId; data: CompendiumEntryBase }>,
    baseLocale: Locale,
  ) => number;
  addImportedSubclasses: (
    list: Array<{ className: string; subclass: ClassSubclass }>,
  ) => number;
  importOwn: (list: HomebrewEntry[]) => number;
  append: (entries: HomebrewEntry[]) => boolean;
  deleteEntry: (id: string) => boolean;
  undoDelete: () => boolean;
  clearAll: () => void;
  checkStorage: () => boolean;
  retry: () => boolean;
  loadStored: () => boolean;
  restore: (entries: HomebrewEntry[], expected: string | null) => boolean;
  baseline: () => string | null;
}

export function homebrewEntryName(entry: HomebrewEntry) {
  return entry.kind === 'subclass' ? entry.subclass.name : entry.name;
}

export function legacyHomebrewEntry(value: unknown): unknown {
  if (isRecord(value) && value.kind === 'imported' && value.baseLocale == null) {
    return { ...value, baseLocale: 'en' };
  }
  return value;
}

export function validateHomebrewEntries(
  value: unknown,
  legacy = false,
): HomebrewEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries = legacy ? value.map(legacyHomebrewEntry) : value;
  if (!entries.every(isSafeHomebrewEntry)) return null;
  const existing = new Set(entries.map((entry) => entry.id));
  if (existing.size === entries.length) return entries;
  if (!legacy) return null;
  const seen = new Set<string>();
  return entries.map((entry, index) => {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      return entry;
    }
    let id = `${entry.id}-legacy-${index}`;
    while (existing.has(id)) id += '-copy';
    existing.add(id);
    return { ...entry, id };
  });
}

export function readHomebrewSnapshot(value: unknown): HomebrewEntry[] | null {
  if (
    !isRecord(value) ||
    typeof value.version !== 'number' ||
    !Number.isInteger(value.version) ||
    value.version < 0 ||
    value.version > HOMEBREW_VERSION ||
    !isRecord(value.state) ||
    Object.keys(value.state).some((key) => key !== 'entries')
  )
    return null;
  return validateHomebrewEntries(
    Object.hasOwn(value.state, 'entries') ? value.state.entries : [],
    value.version < HOMEBREW_VERSION,
  );
}

export function serializeHomebrew(entries: HomebrewEntry[]) {
  return JSON.stringify({ state: { entries }, version: HOMEBREW_VERSION });
}

export function parseStoredHomebrew(raw: string | null) {
  if (raw === null) return [];
  try {
    return readHomebrewSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readStorage() {
  try {
    return {
      ok: true,
      raw:
        typeof window === 'undefined' ? null : window.localStorage.getItem(HOMEBREW_KEY),
    };
  } catch {
    return { ok: false, raw: null };
  }
}

export function homebrewImportedEntry(
  category: CompendiumCategoryId,
  data: HomebrewImportedEntry['data'],
  baseLocale: Locale,
): HomebrewImportedEntry {
  return {
    kind: 'imported',
    id: makeId(data.name),
    category,
    name: data.name,
    baseLocale,
    ...(isUaSource(String(data.source ?? '')) ? { ua: true } : {}),
    data,
    createdAt: Date.now(),
  };
}

export function homebrewSubclassEntry(
  className: string,
  subclass: ClassSubclass,
): HomebrewSubclassEntry {
  const parentClassId = classIdForName(className);
  return {
    kind: 'subclass',
    id: makeId(subclass.name),
    className,
    ...(parentClassId ? { parentClassId } : {}),
    subclass,
    createdAt: Date.now(),
  };
}

export function homebrewSubclassParent(entry: HomebrewSubclassEntry) {
  return entry.parentClassId ?? classIdForName(entry.className);
}

export function homebrewSubclassesFor(
  entries: HomebrewEntry[],
  cls: { id: string; name: string; englishName?: string },
): ClassSubclass[] {
  return entries.flatMap((entry) => {
    if (entry.kind !== 'subclass') return [];
    const parent = homebrewSubclassParent(entry);
    const matches = parent
      ? parent === cls.id ||
        (!entry.parentClassId && parent === classIdForName(cls.englishName ?? cls.name))
      : [cls.name, cls.englishName].some(
          (name) => name?.toLowerCase() === entry.className.toLowerCase(),
        );
    if (!matches) return [];
    const { name, source, features, englishName, lore, image } = entry.subclass;
    return [
      {
        id: entry.id,
        name,
        source,
        features: features.filter(isHomebrewFeature),
        ...(typeof englishName === 'string' ? { englishName } : {}),
        ...(typeof image === 'string' ? { image } : {}),
        ...(Array.isArray(lore)
          ? { lore: lore.filter((node) => isHomebrewDescription(node)) }
          : {}),
      },
    ];
  });
}

function subclassFields(input: SubclassInput, previous?: ClassSubclass) {
  const parentClassId = input.parentClassId ?? classIdForName(input.className);
  return {
    className: input.className,
    ...(parentClassId ? { parentClassId } : {}),
    subclass: {
      ...previous,
      name: input.name,
      source: input.source || HOMEBREW_SOURCE,
      features: input.features ?? [
        {
          level: SUBCLASS_FEATURE_LEVEL,
          name: input.name,
          entries: bodyToEntries(input.body ?? ''),
        },
      ],
    },
  };
}

export async function withHomebrewWrite<T>(write: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request(HOMEBREW_KEY, write) : write();
}

export function createHomebrewStore() {
  const initial = readStorage();
  const initialEntries = initial.ok ? parseStoredHomebrew(initial.raw) : null;
  let baseline = initial.raw;
  let hasBaseline = initialEntries !== null;

  return create<HomebrewState>((set, get) => {
    const checkStorage = () => {
      const stored = readStorage();
      if (stored.ok && hasBaseline && stored.raw === baseline) {
        const { dirty, status } = get();
        if (status === 'conflict' || status === 'unreadable')
          set({ status: dirty ? 'unsaved' : 'saved', raw: null });
        return true;
      }
      set({
        status: stored.ok && parseStoredHomebrew(stored.raw) ? 'conflict' : 'unreadable',
        raw: stored.raw,
      });
      return false;
    };

    const write = (entries: HomebrewEntry[]) => {
      const serialized = serializeHomebrew(entries);
      try {
        window.localStorage.setItem(HOMEBREW_KEY, serialized);
      } catch {
        return false;
      }
      baseline = serialized;
      hasBaseline = true;
      set({ entries, status: 'saved', dirty: false, raw: null });
      return true;
    };

    const commit = (entries: HomebrewEntry[]) => {
      if (!checkStorage()) return false;
      if (!write(entries)) set({ entries, status: 'unsaved', dirty: true });
      return true;
    };

    const append = (entries: HomebrewEntry[]) => {
      if (!entries.length || !commit([...entries, ...get().entries])) return false;
      const deleted = get().deleted;
      if (deleted && entries.some((entry) => entry.id === deleted.entry.id))
        set({ deleted: null });
      return true;
    };

    const update = <Kind extends HomebrewEntry['kind']>(
      id: string,
      kind: Kind,
      edit: (entry: Extract<HomebrewEntry, { kind: Kind }>) => HomebrewEntry,
    ) => {
      const entries = get().entries;
      if (!entries.some((entry) => entry.id === id && entry.kind === kind)) return false;
      return commit(
        entries.map((entry) =>
          entry.id === id && entry.kind === kind
            ? edit(entry as Extract<HomebrewEntry, { kind: Kind }>)
            : entry,
        ),
      );
    };

    return {
      entries: initialEntries ?? [],
      status: initialEntries ? 'saved' : 'unreadable',
      dirty: false,
      raw: initialEntries ? null : initial.raw,
      deleted: null,
      baseline: () => baseline,
      checkStorage,
      retry: () => checkStorage() && write(get().entries),
      loadStored: () => {
        const stored = readStorage();
        const entries = stored.ok ? parseStoredHomebrew(stored.raw) : null;
        if (!entries) {
          set({ status: 'unreadable', raw: stored.raw });
          return false;
        }
        baseline = stored.raw;
        hasBaseline = true;
        set({ entries, raw: null, status: 'saved', dirty: false, deleted: null });
        return true;
      },
      restore: (entries, expected) => {
        const stored = readStorage();
        if (!stored.ok || stored.raw !== expected) {
          checkStorage();
          return false;
        }
        if (!write(entries)) return false;
        set({ deleted: null });
        return true;
      },
      append,
      addManual: (input) => {
        const id = makeId(input.name);
        return append([{ kind: 'manual', ...input, id, createdAt: Date.now() }])
          ? id
          : '';
      },
      updateManual: (id, patch) =>
        update(id, 'manual', (entry) => ({ ...entry, ...patch })),
      updateImported: (id, patch) =>
        update(id, 'imported', (entry) => ({ ...entry, ...patch })),
      addSubclass: (input) => {
        const id = makeId(input.name);
        return append([
          { kind: 'subclass', ...subclassFields(input), id, createdAt: Date.now() },
        ])
          ? id
          : '';
      },
      updateSubclass: (id, input) =>
        update(id, 'subclass', (entry) => {
          const fields = subclassFields(input, entry.subclass);
          const updated = { ...entry, ...fields };
          if (!fields.parentClassId) delete updated.parentClassId;
          return updated;
        }),
      deleteEntry: (id) => {
        const entries = get().entries;
        const index = entries.findIndex((entry) => entry.id === id);
        if (index < 0 || !commit(entries.filter((entry) => entry.id !== id)))
          return false;
        set({ deleted: { entry: entries[index]!, index } });
        return true;
      },
      undoDelete: () => {
        const { deleted, entries } = get();
        if (!deleted || entries.some((entry) => entry.id === deleted.entry.id))
          return false;
        const next = entries.slice();
        next.splice(deleted.index, 0, deleted.entry);
        if (!commit(next)) return false;
        set({ deleted: null });
        return true;
      },
      addImported: (list, locale) => {
        const entries = list
          .filter(
            ({ category, data }) =>
              isHomebrewCategory(category) &&
              isImportedData(data) &&
              data.id &&
              fitsEntryLimit(data),
          )
          .map(({ category, data }) =>
            homebrewImportedEntry(
              category,
              data as HomebrewImportedEntry['data'],
              locale,
            ),
          );
        return append(entries) ? entries.length : 0;
      },
      addImportedSubclasses: (list) => {
        const entries = list
          .map(({ className, subclass }) => homebrewSubclassEntry(className, subclass))
          .filter(isSafeHomebrewEntry);
        return append(entries) ? entries.length : 0;
      },
      importOwn: (list) => {
        const entries = list
          .map(legacyHomebrewEntry)
          .filter(isSafeHomebrewEntry)
          .filter(
            (entry) =>
              fitsEntryLimit(entry) &&
              (entry.kind !== 'imported' || Boolean(entry.data.id)),
          )
          .map((entry) => ({
            ...entry,
            id: makeId(homebrewEntryName(entry)),
            createdAt: Date.now(),
          }));
        return append(entries) ? entries.length : 0;
      },
      clearAll: () => {
        commit([]);
      },
    };
  });
}

export const useHomebrewStore = createHomebrewStore();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === HOMEBREW_KEY || event.key === null)
      useHomebrewStore.getState().checkStorage();
  });
  const preventUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  useHomebrewStore.subscribe((state, previous) => {
    if (state.dirty === previous.dirty) return;
    if (state.dirty) window.addEventListener('beforeunload', preventUnload);
    else window.removeEventListener('beforeunload', preventUnload);
  });
}
