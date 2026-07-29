import { describe, expect, it } from 'vitest';
import { looks5etools, parse5etoolsHomebrew, SUPPORTED_KEYS } from './import5etools';

describe('5etools homebrew import', () => {
  it('recognizes supported documents and rejects unrelated JSON', () => {
    expect(looks5etools({ _meta: {} })).toBe(true);
    expect(looks5etools({ skill: [] })).toBe(true);
    expect(looks5etools({ notes: [] })).toBe(false);
    expect(looks5etools(null)).toBe(false);
  });

  it('imports valid entries while skipping unsupported and malformed data', () => {
    const result = parse5etoolsHomebrew({
      skill: [
        {
          name: 'Aethercraft',
          source: 'HB',
          ability: 'int',
          entries: ['Identify unstable magic.'],
        },
        { source: 'HB' },
        { name: 'Copied', source: 'HB', _copy: { name: 'Arcana', source: 'PHB' } },
      ],
      unknownCollection: [{ name: 'Unknown', source: 'HB' }],
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      category: 'skills',
      data: { name: 'Aethercraft', source: 'HB' },
    });
    expect(result.skipped).toEqual(['unknownCollection']);
  });

  it('routes every supported collection through its normalizer', () => {
    const document = Object.fromEntries(
      SUPPORTED_KEYS.map((key) => [
        key,
        [
          {
            name: `Test ${key}`,
            source: 'HB',
            entries: ['Description.'],
            type: 'Other',
            ability: 'int',
          },
        ],
      ]),
    );
    const result = parse5etoolsHomebrew(document);

    expect(result.skipped).toEqual([]);
    expect(result.entries.length).toBeGreaterThan(20);
    expect(result.entries.map((entry) => entry.category)).toEqual(
      expect.arrayContaining(['spells', 'items', 'bestiary', 'vehicles']),
    );
  });

  it('imports classes and standalone subclasses', () => {
    const classes = parse5etoolsHomebrew({
      class: [{ name: 'Scholar', source: 'HB', classFeatures: [] }],
      subclass: [
        {
          name: 'Archivist',
          shortName: 'Archivist',
          source: 'HB',
          className: 'Scholar',
          classSource: 'HB',
          subclassFeatures: [],
        },
      ],
    });
    expect(classes.entries[0]).toMatchObject({
      category: 'classes',
      data: { name: 'Scholar' },
    });

    const subclasses = parse5etoolsHomebrew({
      subclass: [
        {
          name: 'Archivist',
          shortName: 'Archivist',
          source: 'HB',
          className: 'Scholar',
          classSource: 'HB',
          subclassFeatures: [],
        },
      ],
    });
    expect(subclasses.subclasses[0]).toMatchObject({
      className: 'Scholar',
      subclass: { name: 'Archivist' },
    });
  });
});
