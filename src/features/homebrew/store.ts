import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Entry } from '@/data/compendium/entry';
import type {
  ClassSubclass,
  CompendiumCategoryId,
  CompendiumEntryBase,
} from '@/data/compendium/types';
import type { Locale } from '@/i18n/locales';

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

  data: CompendiumEntryBase & Record<string, unknown>;
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
  return {
    ...entry.data,
    id: entry.id,
    name: entry.name,
    source: HOMEBREW_SOURCE,
    srd: false,
    _homebrew: true,
    _manual: false,
    subtitle: '',
    entries: Array.isArray(entry.data.entries) ? (entry.data.entries as Entry[]) : [],
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
  deleteEntry: (id: string) => void;

  addImported: (
    list: Array<{ category: CompendiumCategoryId; data: CompendiumEntryBase }>,
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
      deleteEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      addImported: (list) => {
        const valid = list.filter((e) => e.data && typeof e.data.name === 'string');
        set((state) => ({
          entries: [
            ...valid.map<HomebrewImportedEntry>((e) => ({
              kind: 'imported',
              id: makeId(e.data.name),
              category: e.category,
              name: e.data.name,
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
    { name: 'fumble-homebrew', version: 2 },
  ),
);
