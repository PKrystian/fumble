import { describe, expect, it } from 'vitest';
import { categories, getCategory } from './categories';
import type { ConditionEntry, SpellEntry } from '@/data/compendium/types';
import { translate } from '@/i18n/useT';

const t = (key: string, vars?: Record<string, string | number>) =>
  translate('en', key, vars);

describe('compendium categories', () => {
  it('resolves a known category by id', () => {
    expect(getCategory('spells')?.label).toBe('Spells');
  });

  it('returns undefined for an unknown category', () => {
    expect(getCategory('nonsense')).toBeUndefined();
  });

  it('builds a spell subtitle from level and school', () => {
    const spells = getCategory('spells')!;
    const cantrip = { level: 0, school: 'Evocation' } as SpellEntry;
    const leveled = { level: 3, school: 'Evocation' } as SpellEntry;
    expect(spells.subtitle(cantrip, t)).toBe('Cantrip · Evocation');
    expect(spells.subtitle(leveled, t)).toBe('Level 3 · Evocation');
  });

  it('uses the kind as a condition subtitle', () => {
    const conditions = getCategory('conditions')!;
    expect(conditions.subtitle({ kind: 'disease' } as ConditionEntry, t)).toBe('disease');
  });

  it('exposes a stable category order', () => {
    expect(categories.map((c) => c.id)).toEqual([
      'species',
      'classes',
      'backgrounds',
      'feats',
      'optionalfeatures',
      'spells',
      'items',
      'bestiary',
      'actions',
      'conditions',
      'rules',
      'deities',
      'hazards',
      'boons',
      'skills',
      'senses',
      'languages',
      'cultsboons',
      'facilities',
      'recipes',
      'objects',
      'vehicles',
      'masteries',
      'charoptions',
      'tables',
      'decks',
    ]);
  });

  it('summarizes feats and rules by type', () => {
    expect(getCategory('feats')!.subtitle({ category: 'General' } as never, t)).toBe(
      'General feat',
    );
    expect(getCategory('rules')!.subtitle({ ruleType: 'Core' } as never, t)).toBe(
      'Core rule',
    );
  });
});
