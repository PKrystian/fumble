import { describe, expect, it } from 'vitest';
import { localizeEntry, localizeItems } from './localize';
import type { CompendiumEntryBase } from './types';

function makeEntry(id: string, name: string): CompendiumEntryBase {
  return { id, name, source: 'XPHB', srd: true };
}

describe('localizeEntry', () => {
  it('falls back to the English entry when there is no overlay', () => {
    const entry = makeEntry('blinded', 'Blinded');
    expect(localizeEntry(entry, undefined)).toBe(entry);
  });

  it('falls back to the English entry when the overlay has no matching id', () => {
    const entry = makeEntry('blinded', 'Blinded');
    expect(localizeEntry(entry, { deafened: { name: 'Ogłuchły' } })).toBe(entry);
  });

  it('overlays translated fields while keeping untranslated fields from English', () => {
    const entry = makeEntry('blinded', 'Blinded');
    const result = localizeEntry(entry, { blinded: { name: 'Oślepiony' } });
    expect(result.name).toBe('Oślepiony');
    expect(result.id).toBe('blinded');
    expect(result.source).toBe('XPHB');
  });

  it('does not record an English name for unchanged or non-string names', () => {
    const entry = makeEntry('blinded', 'Blinded');
    expect(localizeEntry(entry, { blinded: { name: 'Blinded' } }).englishName).toBe(
      undefined,
    );
    expect(localizeEntry(entry, { blinded: { name: 42 } }).englishName).toBe(undefined);
  });
});

describe('localizeItems', () => {
  it('returns the English list unchanged when there is no overlay', () => {
    const items = [makeEntry('blinded', 'Blinded'), makeEntry('deafened', 'Deafened')];
    expect(localizeItems(items, undefined)).toBe(items);
  });

  it('translates only the entries present in a partial overlay', () => {
    const items = [makeEntry('blinded', 'Blinded'), makeEntry('deafened', 'Deafened')];
    const result = localizeItems(items, { blinded: { name: 'Oślepiony' } });
    expect(result[0]!.name).toBe('Oślepiony');
    expect(result[1]!.name).toBe('Deafened');
  });
});
