import { describe, expect, it } from 'vitest';
import {
  canonicalClassFilterValue,
  classFilterLabel,
  classIdForName,
} from './classNames';

describe('class filter names', () => {
  it('recognizes Apothecary and Talent in both locales', () => {
    expect(classIdForName('Apothecary')).toBe('apothecary');
    expect(classIdForName('Aptekarzem')).toBe('apothecary');
    expect(classIdForName('Talent')).toBe('talent');
    expect(canonicalClassFilterValue('Aptekarz')).toBe('Apothecary');
    expect(canonicalClassFilterValue('Talent')).toBe('Talent');
    expect(classFilterLabel('Apothecary', 'pl')).toBe('Aptekarz');
    expect(classFilterLabel('Talent', 'pl')).toBe('Talent');
  });
});
