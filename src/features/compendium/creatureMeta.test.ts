import { describe, expect, it } from 'vitest';
import { agreeSize } from './creatureMeta';

describe('agreeSize', () => {
  it('keeps size without a creature type or known gender', () => {
    expect(agreeSize('Duży', undefined)).toBe('Duży');
    expect(agreeSize('Duży', 'Smok')).toBe('Duży');
  });

  it('agrees known forms and preserves unknown words', () => {
    expect(agreeSize('Malutki lub Wielki', 'Bestia (zmiennokształtny)')).toBe(
      'Malutka lub Wielka',
    );
    expect(agreeSize('Średni', 'Monstrum')).toBe('Średnie');
  });
});
