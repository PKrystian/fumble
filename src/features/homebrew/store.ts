import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entry } from '@/data/compendium/entry';
import type {
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';
import { isUaSource } from '@/data/compendium/sources';

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
  subclass: ClassSubclass;
  createdAt: number;
}

export type HomebrewEntry =
  | HomebrewManualEntry
  | HomebrewImportedEntry
  | HomebrewSubclassEntry;

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

function makeId(name: string): string {
  const base = slugify(name) || 'entry';
  return `hb-${base}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
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
    const subtitle = translation?.subtitle.trim() || entry.subtitle;
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
  const spellAvailability =
    entry.category === 'spells'
      ? inferSpellAvailability(entry, data, entries, locale)
      : {};
  return {
    ...data,
    ...spellAvailability,
    id: entry.id,
    name: data.name,
    ...(locale === 'pl' && entry.baseLocale === 'en' && data.name !== entry.name
      ? { englishName: entry.name }
      : {}),
    source: HOMEBREW_SOURCE,
    srd: false,
    _homebrew: true,
    _manual: false,
    ...(entry.ua ? { ua: true } : {}),
    subtitle: '',
    entries: Array.isArray(data.entries) ? (data.entries as Entry[]) : [],
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
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

interface ManualInput {
  category: CompendiumCategoryId;
  name: string;
  subtitle: string;
  body: string;
  image?: string;
  translations?: Partial<Record<Locale, HomebrewTranslation>>;
}

interface SubclassInput {
  className: string;
  name: string;
  source: string;
  body: string;
}

const SUBCLASS_FEATURE_LEVEL = 3;

interface HomebrewState {
  entries: HomebrewEntry[];
  addManual: (input: ManualInput) => string;
  updateManual: (id: string, patch: Partial<ManualInput>) => void;
  updateImported: (
    id: string,
    patch: Partial<
      Pick<
        HomebrewImportedEntry,
        'category' | 'name' | 'baseLocale' | 'data' | 'translations'
      >
    >,
  ) => void;
  deleteEntry: (id: string) => void;

  addImported: (
    list: Array<{ category: CompendiumCategoryId; data: CompendiumEntryBase }>,
    baseLocale: Locale,
  ) => number;

  addSubclass: (input: SubclassInput) => string;

  addImportedSubclasses: (
    list: Array<{ className: string; subclass: ClassSubclass }>,
  ) => number;

  importOwn: (list: HomebrewEntry[]) => number;
  clearAll: () => void;
}

export const useHomebrewStore = create<HomebrewState>()(
  persist(
    (set) => ({
      entries: [],
      addManual: (input) => {
        const id = makeId(input.name);
        set((state) => ({
          entries: [
            { kind: 'manual', ...input, id, createdAt: Date.now() },
            ...state.entries,
          ],
        }));
        return id;
      },
      updateManual: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id && e.kind === 'manual' ? { ...e, ...patch } : e,
          ),
        })),
      updateImported: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id && entry.kind === 'imported' ? { ...entry, ...patch } : entry,
          ),
        })),
      deleteEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      addImported: (list, baseLocale) => {
        const valid = list.filter((e) => e.data && typeof e.data.name === 'string');
        set((state) => ({
          entries: [
            ...valid.map<HomebrewImportedEntry>((e) => ({
              kind: 'imported',
              id: makeId(e.data.name),
              category: e.category,
              name: e.data.name,
              baseLocale,
              ...(isUaSource(String(e.data.source ?? '')) ? { ua: true } : {}),
              data: e.data as CompendiumEntryBase & Record<string, unknown>,
              createdAt: Date.now(),
            })),
            ...state.entries,
          ],
        }));
        return valid.length;
      },
      addSubclass: (input) => {
        const id = makeId(input.name);
        set((state) => ({
          entries: [
            {
              kind: 'subclass',
              id,
              className: input.className,
              subclass: {
                name: input.name,
                source: input.source || HOMEBREW_SOURCE,
                features: [
                  {
                    level: SUBCLASS_FEATURE_LEVEL,
                    name: input.name,
                    entries: bodyToEntries(input.body),
                  },
                ],
              },
              createdAt: Date.now(),
            },
            ...state.entries,
          ],
        }));
        return id;
      },
      addImportedSubclasses: (list) => {
        const valid = list.filter((e) => e.className && e.subclass?.name);
        set((state) => ({
          entries: [
            ...valid.map<HomebrewSubclassEntry>((e) => ({
              kind: 'subclass',
              id: makeId(e.subclass.name),
              className: e.className,
              subclass: e.subclass,
              createdAt: Date.now(),
            })),
            ...state.entries,
          ],
        }));
        return valid.length;
      },
      importOwn: (list) => {
        const valid = list.filter(
          (e) =>
            e &&
            ((e.kind === 'manual' || e.kind === 'imported') && e.category
              ? true
              : e.kind === 'subclass' && Boolean(e.className)),
        );
        set((state) => ({
          entries: [
            ...valid.map((e) => ({
              ...e,
              ...(e.kind === 'imported' ? { baseLocale: e.baseLocale ?? 'en' } : {}),
              id: makeId(e.kind === 'subclass' ? e.subclass.name : e.name),
              createdAt: Date.now(),
            })),
            ...state.entries,
          ],
        }));
        return valid.length;
      },
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'fumble-homebrew',
      version: 3,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<HomebrewState>;
        return {
          ...state,
          entries: (state.entries ?? []).map((entry) =>
            entry.kind === 'imported'
              ? { ...entry, baseLocale: entry.baseLocale ?? 'en' }
              : entry,
          ),
        } as HomebrewState;
      },
    },
  ),
);
