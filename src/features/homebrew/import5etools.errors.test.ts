import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/transform/normalize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/transform/normalize')>();
  return {
    ...actual,
    normalizeClasses: () => {
      throw new Error('invalid class');
    },
    normalizeStandaloneSubclasses: () => {
      throw new Error('invalid subclass');
    },
  };
});

import { parse5etoolsHomebrew } from './import5etools';

describe('5etools class import errors', () => {
  it('reports malformed classes', () => {
    expect(
      parse5etoolsHomebrew({
        class: [{ name: 'Broken', source: 'HB' }],
      }).skipped,
    ).toEqual(['class']);
  });

  it('reports malformed standalone subclasses', () => {
    expect(
      parse5etoolsHomebrew({
        subclass: [{ name: 'Broken', source: 'HB' }],
      }).skipped,
    ).toEqual(['subclass']);
  });
});
