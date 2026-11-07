import { describe, expect, it } from 'vitest';
import {
  compendiumPrintingSeo as printingSeo,
  isCompendiumSubclassIndexable,
} from './indexability';

const compendiumPrintingSeo = (
  item: Parameters<typeof printingSeo>[0],
  siblings: Parameters<typeof printingSeo>[1],
  category = 'spells',
) => printingSeo(item, siblings, category);

const entry = (
  id: string,
  options: Partial<Parameters<typeof compendiumPrintingSeo>[0]> & {
    entries?: string[];
  } = {},
) => ({ id, name: 'Acid Splash', source: 'PHB', ...options });

describe('compendium entry indexability', () => {
  it('indexes visible entries', () => {
    expect(
      compendiumPrintingSeo(entry('acid-splash-phb', { hidden: false }), []),
    ).toEqual({ indexable: true });
  });

  it('keeps hidden entries with another printing out of search indexes', () => {
    expect(
      compendiumPrintingSeo(
        {
          ...entry('acid-splash-phb', { hidden: true }),
          hidden: true,
          otherVersions: [{ id: 'acid-splash-xphb', source: 'XPHB' }],
        },
        [],
      ),
    ).toEqual({ indexable: false });
  });

  it('keeps hidden entries without another printing out of search indexes', () => {
    expect(compendiumPrintingSeo(entry('acid-splash-phb', { hidden: true }), [])).toEqual(
      { indexable: false },
    );
  });

  it('keeps same-source aliases out of search indexes', () => {
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
    expect(compendiumPrintingSeo(first, [first, second]).indexable).toBe(false);
    expect(compendiumPrintingSeo(second, [first, second]).indexable).toBe(false);
    expect(
      compendiumPrintingSeo(second, [first, { ...entry('oghma', { name: 'Oghma' }) }]),
    ).toEqual({ indexable: false });
  });

  it('consolidates an identical printing and keeps changed core rules independent', () => {
    const modern = entry('acid-splash', { source: 'XPHB', entries: ['New rules'] });
    const older = entry('acid-splash-phb', {
      hidden: true,
      otherVersions: [{ id: modern.id, source: modern.source }],
      entries: ['New rules'],
    });
    expect(compendiumPrintingSeo(older, [modern])).toEqual({
      indexable: false,
      canonicalId: modern.id,
    });
    const changed = { ...older, entries: ['Original rules'] };
    expect(compendiumPrintingSeo(changed, [modern])).toEqual({ indexable: true });
    expect(compendiumPrintingSeo(changed, [modern], 'deities')).toEqual({
      indexable: false,
    });
    const oldItem = { ...older, variant: { source: 'DMG' } };
    const modernItem = { ...modern, variant: { source: 'XDMG' } };
    expect(compendiumPrintingSeo(oldItem, [modernItem], 'items')).toEqual({
      indexable: false,
    });
    expect(compendiumPrintingSeo({ ...changed, source: 'TCE' }, [modern])).toEqual({
      indexable: false,
    });
    expect(compendiumPrintingSeo({ ...changed, source: 'DMG' }, [modern])).toEqual({
      indexable: false,
    });
    const reprint = entry('acid-splash-tce', { source: 'TCE', entries: ['Other rules'] });
    expect(
      compendiumPrintingSeo(
        {
          ...older,
          otherVersions: [
            { id: reprint.id, source: reprint.source },
            { id: modern.id, source: modern.source },
          ],
        },
        [reprint, { ...modern, hidden: true }],
      ),
    ).toEqual({ indexable: false });
  });

  it('keeps duplicate subclass routes under a hidden parent out of indexes', () => {
    expect(isCompendiumSubclassIndexable({ hidden: true }, true)).toBe(false);
    expect(isCompendiumSubclassIndexable({ hidden: true }, false)).toBe(true);
    expect(isCompendiumSubclassIndexable({ hidden: false }, true)).toBe(true);
  });
});
