import { describe, expect, it } from 'vitest';
import { looks5etools, parse5etoolsHomebrew } from './import5etools';

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
});
