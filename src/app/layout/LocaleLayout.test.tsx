import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./AppLayout', () => ({ AppLayout: () => <div>layout</div> }));

import { LocaleLayout } from './LocaleLayout';

describe('LocaleLayout', () => {
  it('synchronizes the document with the URL locale', () => {
    const { rerender } = render(<LocaleLayout locale="en" />);

    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText('layout')).toBeInTheDocument();

    rerender(<LocaleLayout locale="pl" />);
    expect(document.documentElement.lang).toBe('pl');
  });
});
