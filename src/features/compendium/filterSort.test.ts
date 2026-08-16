import { describe, expect, it } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { CategoryFilter } from './categories';
import { compareItems, displayValue, matchesFilters } from './filterSort';

const t = (key: string, vars?: Record<string, string | number>) =>
  vars?.level ? `${key}:${vars.level}` : key;

const entry = (name: string, level?: string): CompendiumEntryBase => {
  const value = {
    id: name.toLowerCase(),
    name,
    source: 'XPHB',
    srd: false,
    ...(level ? { level } : {}),
  };
  return value as unknown as CompendiumEntryBase;
};

const filter: CategoryFilter = {
  id: 'level',
  label: 'Level',
  valuesFor: (item) => ('level' in item && item.level ? [String(item.level)] : []),
};

describe('compendium sorting', () => {
  it('localizes known display values', () => {
    expect(displayValue(filter, 'Cantrip', t, 'en')).toBe('compendium.filters.cantrip');
    expect(displayValue(filter, 'Level 4', t, 'en')).toBe('compendium.filters.levelN:4');
    expect(displayValue(filter, 'Yes', t, 'en')).toBe('compendium.filters.yes');
    expect(displayValue(filter, 'No', t, 'en')).toBe('compendium.filters.no');
    expect(
      displayValue({ ...filter, labelFor: (value) => `label:${value}` }, 'x', t, 'en'),
    ).toBe('label:x');
    expect(displayValue(filter, 'Other', t, 'en')).toBe('Other');
    expect(
      displayValue(
        { ...filter, valueLabelKey: (value) => `compendium.filters.values.${value}` },
        'sidekick',
        t,
        'en',
      ),
    ).toBe('compendium.filters.values.sidekick');
  });

  it('applies default visibility and selected filter values', () => {
    const typeFilter: CategoryFilter = {
      id: 'type',
      label: 'Type',
      valuesFor: (item) => [item.id === 'hidden' ? 'hidden' : 'visible'],
      defaultVisible: (item) => item.id !== 'hidden',
    };
    expect(matchesFilters(entry('Visible'), [typeFilter], {})).toBe(true);
    expect(matchesFilters(entry('Hidden'), [typeFilter], {})).toBe(false);
    expect(matchesFilters(entry('Hidden'), [typeFilter], { type: ['hidden'] })).toBe(
      true,
    );
    expect(matchesFilters(entry('Hidden'), [typeFilter], { type: ['visible'] })).toBe(
      false,
    );
  });

  it('includes Any values when the filter enables the option', () => {
    const habitatFilter: CategoryFilter = {
      id: 'habitat',
      label: 'Habitat',
      includeAny: true,
      valuesFor: (item) =>
        'habitat' in item && typeof item.habitat === 'string' ? [item.habitat] : [],
    };
    const anyMonster = { ...entry('Any monster'), habitat: 'Any' };
    expect(
      matchesFilters(
        anyMonster,
        [habitatFilter],
        { habitat: ['Urban'] },
        { habitat: true },
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        anyMonster,
        [habitatFilter],
        { habitat: ['Urban'] },
        { habitat: false },
      ),
    ).toBe(false);
  });

  it('sorts by name and direction', () => {
    const a = entry('Alpha');
    const b = entry('Beta');
    expect(compareItems(a, b, 'name', 'asc', [filter], t, 'en')).toBeLessThan(0);
    expect(compareItems(a, b, 'name', 'desc', [filter], t, 'en')).toBeGreaterThan(0);
  });

  it('sorts filter values, empty values and ties', () => {
    const a = entry('Alpha', 'Level 1');
    const b = entry('Beta', 'Level 2');
    const empty = entry('Empty');
    expect(compareItems(a, b, 'level', 'asc', [filter], t, 'en')).toBeLessThan(0);
    expect(compareItems(empty, b, 'level', 'asc', [filter], t, 'en')).toBeGreaterThan(0);
    expect(compareItems(a, empty, 'level', 'asc', [filter], t, 'en')).toBeLessThan(0);
    expect(
      compareItems(empty, entry('Other'), 'level', 'asc', [filter], t, 'en'),
    ).toBeLessThan(0);
  });

  it('uses numeric sort keys', () => {
    const numeric = {
      ...filter,
      sortKey: (value: string) => Number(value),
      valuesFor: (item: CompendiumEntryBase) =>
        'level' in item && item.level ? [String(item.level)] : [],
    };
    expect(
      compareItems(
        entry('Ten', '10'),
        entry('Two', '2'),
        'level',
        'asc',
        [numeric],
        t,
        'en',
      ),
    ).toBeGreaterThan(0);
  });

  it('sorts multiple localized values before comparing entries', () => {
    const multiple: CategoryFilter = {
      id: 'tags',
      label: 'Tags',
      valuesFor: (item) => (item.id === 'alpha' ? ['Zulu', 'Alpha'] : ['Zulu', 'Beta']),
    };
    expect(
      compareItems(entry('Alpha'), entry('Beta'), 'tags', 'asc', [multiple], t, 'en'),
    ).toBeLessThan(0);
    expect(
      compareItems(entry('Alpha'), entry('Beta'), 'tags', 'desc', [multiple], t, 'en'),
    ).toBeGreaterThan(0);
  });
});
