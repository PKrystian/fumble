import { normalizeSearchText } from '@/data/compendium/searchText';
import type { Locale } from '@/i18n/locales';
import { looks5etools, parse5etoolsHomebrew } from './import5etools';
import {
  fitsEntryLimit,
  homebrewEntryName,
  homebrewImportedEntry,
  homebrewSubclassEntry,
  homebrewSubclassParent,
  isImportedData,
  isRecord,
  legacyHomebrewEntry,
  validateHomebrewEntries,
  type HomebrewEntry,
} from './store';
import { canRenderHomebrew, isRenderableSubclass } from './validateImported';

export const HOMEBREW_FILE_BYTES = 10 * 1024 * 1024;
const format = 'fumble-homebrew';
const version = 1;

type FileErrorKey =
  'tooLarge' | 'invalidJson' | 'invalidFormat' | 'invalidBackup' | 'unsupportedVersion';

export class HomebrewFileError extends Error {
  readonly key: FileErrorKey;

  constructor(key: FileErrorKey) {
    super(key);
    this.key = key;
  }
}

export function homebrewBackupText(entries: HomebrewEntry[]) {
  const text = JSON.stringify({
    app: format,
    version,
    exportedAt: new Date().toISOString(),
    entries,
  });
  if (new Blob([text]).size > HOMEBREW_FILE_BYTES)
    throw new HomebrewFileError('tooLarge');
  return text;
}

function parse(text: string) {
  if (new Blob([text]).size > HOMEBREW_FILE_BYTES)
    throw new HomebrewFileError('tooLarge');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HomebrewFileError('invalidJson');
  }
}

function metadata(document: Record<string, unknown>) {
  if (document.app === undefined) return { version: null, exportedAt: null };
  if (document.app !== format) throw new HomebrewFileError('invalidFormat');
  if (document.version !== version) throw new HomebrewFileError('unsupportedVersion');
  if (
    typeof document.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(document.exportedAt))
  ) {
    throw new HomebrewFileError('invalidBackup');
  }
  return { version, exportedAt: document.exportedAt };
}

export function readHomebrewBackup(text: string) {
  const data = parse(text);
  if (!isRecord(data) || !Array.isArray(data.entries))
    throw new HomebrewFileError('invalidFormat');
  const meta = metadata(data);
  const entries = validateHomebrewEntries(data.entries, meta.version === null);
  if (!entries) throw new HomebrewFileError('invalidBackup');
  return { entries, ...meta };
}

function entryIdentity(entry: HomebrewEntry): string {
  if (entry.kind === 'subclass') {
    return JSON.stringify([
      'subclass',
      homebrewSubclassParent(entry) ?? normalizeSearchText(entry.className),
      normalizeSearchText(entry.subclass.name),
      entry.subclass.source.toLowerCase(),
    ]);
  }
  if (entry.kind === 'imported') {
    return JSON.stringify([
      'imported',
      entry.category,
      entry.data.id || normalizeSearchText(entry.data.name),
      entry.data.source ?? '',
    ]);
  }
  return JSON.stringify([
    'manual',
    entry.category,
    entry.name,
    entry.subtitle,
    entry.body,
    entry.image || '',
    entry.translations?.en,
    entry.translations?.pl,
  ]);
}

export function previewHomebrewImport(
  text: string,
  locale: Locale,
  current: HomebrewEntry[],
) {
  const document = parse(text);
  if (!isRecord(document)) throw new HomebrewFileError('invalidFormat');
  const entries: HomebrewEntry[] = [];
  let invalid = 0;
  let duplicates = 0;
  let copied = 0;
  let unsupported = 0;
  const own = Array.isArray(document.entries);
  const ids = new Set(current.map((entry) => entry.id));
  const identities = new Set(current.map(entryIdentity));
  const add = (entry: HomebrewEntry) => {
    const identity = entryIdentity(entry);
    if (ids.has(entry.id) || identities.has(identity)) {
      duplicates += 1;
      return;
    }
    ids.add(entry.id);
    identities.add(identity);
    entries.push(entry);
  };
  const info = own ? metadata(document) : { version: null, exportedAt: null };
  if (own) {
    for (const raw of document.entries as unknown[]) {
      const entry = validateHomebrewEntries([
        info.version === null ? legacyHomebrewEntry(raw) : raw,
      ])?.[0];
      if (entry) add(entry);
      else invalid += 1;
    }
  } else {
    if (!looks5etools(document)) throw new HomebrewFileError('invalidFormat');
    const parsed = parse5etoolsHomebrew(document, locale);
    ({ invalid, copied, unsupported } = parsed);
    for (const { category, data } of parsed.entries) {
      if (
        isImportedData(data) &&
        canRenderHomebrew(category, data) &&
        fitsEntryLimit(data)
      )
        add(homebrewImportedEntry(category, data, locale));
      else invalid += 1;
    }
    for (const { className, subclass } of parsed.subclasses) {
      if (
        typeof className === 'string' &&
        className.trim() &&
        isRenderableSubclass(subclass) &&
        fitsEntryLimit(subclass)
      )
        add(homebrewSubclassEntry(className, subclass));
      else invalid += 1;
    }
  }

  return {
    entries,
    invalid,
    duplicates,
    copied,
    unsupported,
    format: own ? ('fumble' as const) : ('5etools' as const),
    locale: own ? null : locale,
    ...info,
  };
}

export function homebrewImportNames(entries: HomebrewEntry[]) {
  return entries.slice(0, 5).map(homebrewEntryName).join(', ');
}
