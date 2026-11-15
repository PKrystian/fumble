import { describe, expect, it } from 'vitest';
import { parseBackup } from '@/features/data/backup';
import { HOMEBREW_KEY, serializeHomebrew, type HomebrewManualEntry } from './store';
import {
  homebrewBackupText,
  HOMEBREW_FILE_BYTES,
  previewHomebrewImport,
  readHomebrewBackup,
} from './homebrewFiles';

const manual = (index = 0): HomebrewManualEntry => ({
  kind: 'manual',
  id: 'legacy-long-' + 'x'.repeat(230) + index,
  name: 'Wpis ' + index,
  createdAt: index,
  category: 'items',
  body: '',
  subtitle: '',
});
const image = 'data:image/jpeg;base64,' + 'a'.repeat(25_000);

describe('Homebrew backup and preview', () => {
  it('round trips more than 500 entries, original metadata, translations and cropped artwork', () => {
    const entries = Array.from({ length: 521 }, (_, i) => manual(i));
    entries[0] = {
      ...entries[0]!,
      image,
      translations: { pl: { name: 'Żar', subtitle: '', body: '' } },
    };
    const text = homebrewBackupText(entries);
    expect(readHomebrewBackup(text).entries).toEqual(entries);
    expect(previewHomebrewImport(text, 'pl', []).entries).toEqual(entries);
    expect(previewHomebrewImport(text, 'pl', entries)).toMatchObject({
      duplicates: 521,
      entries: [],
    });
    const fullBackup = {
      app: 'fumble',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { [HOMEBREW_KEY]: serializeHomebrew(entries) },
    };
    expect(parseBackup(JSON.stringify(fullBackup))).toEqual(fullBackup);
  });

  it('reports malformed records and duplicates without writing and validates legacy backups', () => {
    const entry = manual();
    const text = JSON.stringify({ entries: [entry, null, entry] });
    expect(previewHomebrewImport(text, 'en', [])).toMatchObject({
      format: 'fumble',
      invalid: 1,
      duplicates: 1,
      entries: [entry],
    });
    expect(() => readHomebrewBackup(text)).toThrow('invalidBackup');
    expect(readHomebrewBackup(JSON.stringify({ entries: [entry] }))).toMatchObject({
      version: null,
      entries: [entry],
    });
    expect(readHomebrewBackup(JSON.stringify({ entries: [] })).entries).toEqual([]);
    expect(() =>
      readHomebrewBackup(
        JSON.stringify({ app: 'fumble-homebrew', version: 99, entries: [] }),
      ),
    ).toThrow('unsupportedVersion');
    expect(() =>
      readHomebrewBackup(
        JSON.stringify({ app: 'fumble-homebrew', version: 1, entries: [] }),
      ),
    ).toThrow('invalidBackup');
    expect(() => previewHomebrewImport('null', 'en', [])).toThrow('invalidFormat');
    expect(() => readHomebrewBackup('x'.repeat(HOMEBREW_FILE_BYTES + 1))).toThrow(
      'tooLarge',
    );
    expect(() =>
      homebrewBackupText([{ ...entry, body: 'x'.repeat(HOMEBREW_FILE_BYTES) }]),
    ).toThrow('tooLarge');
  });

  it('reports unsupported and invalid 5etools records, and deduplicates repeated imports', () => {
    const raw = {
      spell: [
        { name: 'Audit spell', source: 'HB', level: 1, school: 'A', entries: ['Text'] },
        { name: 'Copied', _copy: {} },
        { name: 'Invalid', entries: [null], source: 'HB' },
      ],
      tables: [{ name: 'Unsupported' }],
      subclass: [
        {
          name: 'School',
          shortName: 'School',
          source: 'HB',
          className: 'Wizard',
          classSource: 'PHB',
        },
      ],
    };
    const first = previewHomebrewImport(JSON.stringify(raw), 'pl', []);
    expect(first).toMatchObject({
      locale: 'pl',
      format: '5etools',
      invalid: 1,
      copied: 1,
      unsupported: 1,
      duplicates: 0,
    });
    expect(first.entries.map((entry) => entry.kind)).toEqual(['imported', 'subclass']);
    expect(previewHomebrewImport(JSON.stringify(raw), 'en', first.entries)).toMatchObject(
      { duplicates: 2, entries: [] },
    );
  });

  it('recognizes missing legacy fields and rejects unrelated backup metadata', () => {
    const legacy = {
      kind: 'imported',
      id: 'old-import',
      category: 'items',
      name: 'Item',
      createdAt: 1,
      data: { name: 'Item' },
    };
    const first = previewHomebrewImport(JSON.stringify({ entries: [legacy] }), 'pl', []);
    expect(first.entries[0]).toMatchObject({ baseLocale: 'en' });
    expect(
      previewHomebrewImport(
        JSON.stringify({ entries: [{ ...legacy, id: 'another' }] }),
        'en',
        first.entries,
      ).duplicates,
    ).toBe(1);
    expect(() => readHomebrewBackup('[]')).toThrow('invalidFormat');
    expect(() => readHomebrewBackup('{"app":"fumble","entries":[]}')).toThrow(
      'invalidFormat',
    );
    expect(() =>
      readHomebrewBackup(
        '{"app":"fumble-homebrew","version":1,"entries":[],"exportedAt":"today"}',
      ),
    ).toThrow('invalidBackup');
  });
});
