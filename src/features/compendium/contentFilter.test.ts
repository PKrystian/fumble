import { describe, expect, it } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import { applyContentMode } from './contentFilter';

const item = (
  id: string,
  source: string,
  options: Partial<CompendiumEntryBase> = {},
): CompendiumEntryBase =>
  ({ id, name: id, source, srd: false, ...options }) as CompendiumEntryBase;

describe('content mode filtering', () => {
  const old = item('old', 'PHB');
  const revised = item('new', 'XPHB', {
    otherVersions: [{ id: 'old', source: 'PHB' }],
  });
  const hidden = item('hidden', 'XPHB', { hidden: true });
  const homebrew = item('brew', HOMEBREW_SOURCE);

  it('returns all visible entries', () => {
    expect(applyContentMode([old, revised, hidden, homebrew], 'all')).toEqual([
      old,
      revised,
      homebrew,
    ]);
  });

  it('returns revised and homebrew entries in 2024 mode', () => {
    expect(applyContentMode([old, revised, hidden, homebrew], '2024')).toEqual([
      revised,
      homebrew,
    ]);
  });

  it('uses the best available old version in 2014 mode', () => {
    expect(applyContentMode([old, revised, hidden, homebrew], '2014')).toEqual([
      old,
      old,
      homebrew,
    ]);
  });

  it('does not add missing old alternatives', () => {
    const orphan = item('orphan', 'XPHB', {
      otherVersions: [{ id: 'missing', source: 'PHB' }],
    });
    expect(applyContentMode([orphan], '2014')).toEqual([]);
  });

  it('skips revised entries without old alternatives', () => {
    expect(applyContentMode([item('new-only', 'XPHB')], '2014')).toEqual([]);
  });

  it('chooses the newest old alternative', () => {
    const phb = item('phb', 'PHB');
    const dmg = item('dmg', 'DMG');
    const current = item('current', 'XPHB', {
      otherVersions: [
        { id: 'phb', source: 'PHB' },
        { id: 'dmg', source: 'DMG' },
      ],
    });
    expect(applyContentMode([phb, dmg, current], '2014')).toEqual([phb, dmg, dmg]);
  });
});
