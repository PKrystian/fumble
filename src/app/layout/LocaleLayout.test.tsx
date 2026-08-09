import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setLocale } = vi.hoisted(() => ({
  setLocale: vi.fn(),
}));

vi.mock('@/i18n/store', () => ({
  useLocaleStore: (selector: (state: { setLocale: typeof setLocale }) => unknown) =>
    selector({ setLocale }),
}));

vi.mock('./AppLayout', () => ({ AppLayout: () => <div>layout</div> }));

import { LocaleLayout } from './LocaleLayout';

describe('LocaleLayout', () => {
  beforeEach(() => {
    setLocale.mockClear();
  });

  it('synchronizes the document and store locale', () => {
    const { rerender } = render(<LocaleLayout locale="en" />);

    expect(document.documentElement.lang).toBe('en');
    expect(setLocale).toHaveBeenCalledWith('en');
    expect(screen.getByText('layout')).toBeInTheDocument();

    rerender(<LocaleLayout locale="pl" />);
    expect(document.documentElement.lang).toBe('pl');
    expect(setLocale).toHaveBeenLastCalledWith('pl');
  });
});
