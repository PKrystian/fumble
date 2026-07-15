import { describe, expect, it } from 'vitest';
import { translate } from './useT';

describe('translate', () => {
  it('resolves a key that exists in the target locale', () => {
    expect(translate('pl', 'nav.home')).toBe('Strona główna');
  });

  it('falls back to English when the target locale is missing the key', () => {
    expect(translate('en', 'nav.home')).toBe('Home');
  });

  it('returns the raw key when neither locale has it (visible failure, not a crash)', () => {
    expect(translate('pl', 'nav.doesNotExist')).toBe('nav.doesNotExist');
  });

  it('interpolates {{vars}} into the resolved string', () => {
    expect(translate('en', 'character.list.level', { level: 5 })).toBe('Level 5');
    expect(translate('pl', 'character.list.level', { level: 5 })).toBe('Poziom 5');
  });

  it('leaves an unmatched placeholder untouched if the var is missing', () => {
    expect(translate('en', 'character.list.level', {})).toBe('Level {{level}}');
  });
});
