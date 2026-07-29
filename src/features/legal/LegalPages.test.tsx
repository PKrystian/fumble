import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  ConnectionsPage,
  LegalOverviewPage,
  LicensesPage,
  PrivacyPage,
  TermsPage,
} from './LegalPages';

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

function renderPage(component: ReactNode) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('legal pages', () => {
  it('links the overview to every legal page', () => {
    renderPage(<LegalOverviewPage />);
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /legal\.privacy\.title/ })).toHaveAttribute(
      'href',
      '/legal/privacy',
    );
  });

  it.each([
    [<PrivacyPage />, 'legal.privacy.title'],
    [<ConnectionsPage />, 'legal.connections.title'],
    [<TermsPage />, 'legal.terms.title'],
    [<LicensesPage />, 'legal.licenses.title'],
  ])('renders a complete information page', (page, title) => {
    renderPage(page);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(3);
  });
});
