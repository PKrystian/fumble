import { describe, expect, it } from 'vitest';
import {
  isCompendiumEntryIndexable,
  isCompendiumSubclassIndexable,
} from './indexability';

const entry = (
  id: string,
  options: Partial<Parameters<typeof isCompendiumEntryIndexable>[0]> = {},
) => ({ id, name: 'Acid Splash', source: 'PHB', ...options });

describe('compendium entry indexability', () => {
  it('indexes visible entries', () => {
    expect(isCompendiumEntryIndexable(entry('acid-splash-phb', { hidden: false }))).toBe(
      true,
    );
  });

  it('indexes hidden entries with another printing', () => {
    expect(
      isCompendiumEntryIndexable({
        ...entry('acid-splash-phb', { hidden: true }),
        hidden: true,
        otherVersions: [{ id: 'acid-splash-xphb', source: 'XPHB' }],
      }),
    ).toBe(true);
  });

  it('keeps hidden entries without another printing out of search indexes', () => {
    expect(isCompendiumEntryIndexable(entry('acid-splash-phb', { hidden: true }))).toBe(
      false,
    );
  });

  it('keeps same-source aliases out while indexing one canonical printing', () => {
    const first = entry('oghma-phb', {
      hidden: true,
      name: 'Oghma',
      otherVersions: [
        { id: 'oghma-phb-2', source: 'PHB' },
        { id: 'oghma', source: 'FRHoF' },
      ],
    });
    const second = entry('oghma-phb-2', {
      hidden: true,
      name: 'Oghma',
      otherVersions: [
        { id: 'oghma-phb', source: 'PHB' },
        { id: 'oghma', source: 'FRHoF' },
      ],
    });
    expect(isCompendiumEntryIndexable(first, [first, second])).toBe(true);
    expect(isCompendiumEntryIndexable(second, [first, second])).toBe(false);
    expect(
      isCompendiumEntryIndexable(second, [
        first,
        { ...entry('oghma', { name: 'Oghma' }) },
      ]),
    ).toBe(false);
  });

  it('keeps duplicate subclass routes under a hidden parent out of indexes', () => {
    expect(isCompendiumSubclassIndexable({ hidden: true }, true)).toBe(false);
    expect(isCompendiumSubclassIndexable({ hidden: true }, false)).toBe(true);
    expect(isCompendiumSubclassIndexable({ hidden: false }, true)).toBe(true);
  });
});
