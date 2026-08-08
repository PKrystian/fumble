import { describe, expect, it } from 'vitest';
import type { ClassSubclass } from '@/data/compendium/types';
import { findSubclassByRouteKey, subclassRouteKey } from './subclassRoute';

const subclasses: ClassSubclass[] = [
  {
    name: 'Wojownik Miłosierdzia',
    englishName: 'Warrior of Mercy',
    source: 'XPHB',
    features: [],
  },
  { id: 'zerth-warrior', name: 'Wojownik Zerth', source: 'Fumble', features: [] },
];

describe('subclass route keys', () => {
  it('keeps localized subclasses on stable English route keys', () => {
    expect(subclassRouteKey(subclasses[0]!)).toBe('warrior-of-mercy-xphb');
    expect(findSubclassByRouteKey(subclasses, 'warrior-of-mercy-xphb')).toBe(
      subclasses[0],
    );
  });

  it('uses homebrew ids and rejects unknown keys', () => {
    expect(subclassRouteKey(subclasses[1]!)).toBe('zerth-warrior');
    expect(findSubclassByRouteKey(subclasses, 'zerth-warrior')).toBe(subclasses[1]);
    expect(findSubclassByRouteKey(subclasses, 'missing')).toBeUndefined();
  });
});
