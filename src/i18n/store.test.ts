import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from './locales';
import { useLocaleStore } from './store';

describe('locale store', () => {
  beforeEach(() => {
    localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it('changes the current locale', () => {
    useLocaleStore.getState().setLocale('pl');
    expect(useLocaleStore.getState().locale).toBe('pl');
  });
});
