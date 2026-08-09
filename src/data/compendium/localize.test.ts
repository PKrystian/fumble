import { describe, expect, it } from 'vitest';
import { localizeEntry, localizeItems } from './localize';
import type { ClassEntry, CompendiumEntryBase } from './types';

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

  it('keeps subclass media when a localized class overlay replaces subclass text', () => {
    const entry = {
      ...makeEntry('monk', 'Monk'),
      subclasses: [
        {
          name: 'Warrior of Shadow',
          source: 'XPHB',
          image: 'classes/XPHB/Shadow Monk.webp',
          features: [],
        },
      ],
    } as unknown as ClassEntry;

    const result = localizeEntry(entry, {
      monk: {
        name: 'Mnich',
        subclasses: [{ name: 'Wojownik Cienia', source: 'XPHB', features: [] }],
      },
    }) as ClassEntry;

    expect(result.subclasses[0]).toMatchObject({
      name: 'Wojownik Cienia',
      englishName: 'Warrior of Shadow',
      image: 'classes/XPHB/Shadow Monk.webp',
    });
  });

  it('matches translated subclasses with repeated sources in order', () => {
    const entry = {
      ...makeEntry('artificer', 'Artificer'),
      subclasses: [
        { name: 'Alchemist', source: 'EFA', features: [] },
        { name: 'Armorer', source: 'EFA', features: [] },
        { name: 'Artillerist', source: 'EFA', features: [] },
      ],
    } as unknown as ClassEntry;

    const result = localizeEntry(entry, {
      artificer: {
        name: 'RzemieÅ›lnik',
        subclasses: [
          { name: 'Alchemik', source: 'EFA', features: [] },
          { name: 'Zbrojmistrz', source: 'EFA', features: [] },
          { name: 'Artylerzysta', source: 'EFA', features: [] },
        ],
      },
    }) as ClassEntry;

    expect(result.subclasses.map(({ name, englishName }) => [name, englishName])).toEqual(
      [
        ['Alchemik', 'Alchemist'],
        ['Zbrojmistrz', 'Armorer'],
        ['Artylerzysta', 'Artillerist'],
      ],
    );
  });

  it('uses English identity when translated subclasses are out of order', () => {
    const entry = {
      ...makeEntry('druid', 'Druid'),
      subclasses: [
        { name: 'Circle of Stars', source: 'XPHB', features: [] },
        { name: 'Circle of Wildfire', source: 'TCE', features: [] },
      ],
    } as unknown as ClassEntry;

    const result = localizeEntry(entry, {
      druid: {
        name: 'Druid',
        subclasses: [
          {
            name: 'Krąg Ognia Dzikiego',
            source: 'TCE',
            englishName: 'Circle of Wildfire',
            features: [],
          },
          {
            name: 'Krąg Gwiazd',
            source: 'XPHB',
            englishName: 'Circle of the Stars',
            features: [],
          },
        ],
      },
    }) as ClassEntry;

    expect(
      result.subclasses.map(({ name, source, englishName }) => [
        name,
        source,
        englishName,
      ]),
    ).toEqual([
      ['Krąg Ognia Dzikiego', 'TCE', 'Circle of Wildfire'],
      ['Krąg Gwiazd', 'XPHB', 'Circle of the Stars'],
    ]);
  });

  it('keeps spell subclass references as strings', () => {
    const entry = {
      ...makeEntry('alarm', 'Alarm'),
      subclasses: ['Bard: College of Lore', 'Wizard: Abjurer'],
    };
    const result = localizeEntry(entry, {
      alarm: {
        subclasses: ['Bard: Szkoła Wiedzy', 'Wizard: Abjurer'],
      },
    });

    expect(result.subclasses).toEqual(['Bard: Szkoła Wiedzy', 'Wizard: Abjurer']);
    expect(result.subclasses?.every((value) => typeof value === 'string')).toBe(true);
  });

  it('keeps English spell references for localized routes', () => {
    const entry = {
      ...makeEntry('alarm', 'Alarm'),
      classes: ['Wizard'],
      subclasses: ['Sorcerer: Clockwork Soul'],
    };
    const result = localizeEntry(entry, {
      alarm: {
        classes: ['Czarodziej'],
        subclasses: ['Czarodziej: Mechaniczna Dusza'],
      },
    });

    expect(result).toMatchObject({
      classes: ['Czarodziej'],
      subclasses: ['Czarodziej: Mechaniczna Dusza'],
      _englishClasses: ['Wizard'],
      _englishSubclasses: ['Sorcerer: Clockwork Soul'],
    });
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
