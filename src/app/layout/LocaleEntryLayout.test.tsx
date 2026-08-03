import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocaleStore } from '@/i18n/store';
import { LocaleEntryLayout } from './LocaleEntryLayout';

vi.mock('./LocaleLayout', () => ({
  LocaleLayout: ({ locale }: { locale: string }) => <output>locale:{locale}</output>,
}));

function Location() {
  const location = useLocation();
  return <output>{location.pathname + location.search + location.hash}</output>;
}

describe('LocaleEntryLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    useLocaleStore.setState({ locale: 'en' });
  });

  it('redirects the root to the remembered locale and preserves the full URL suffix', async () => {
    useLocaleStore.setState({ locale: 'pl' });

    render(
      <MemoryRouter initialEntries={['/?from=bookmark#top']}>
        <Routes>
          <Route path="/" element={<LocaleEntryLayout />} />
          <Route path="/pl/*" element={<output>polish route</output>} />
        </Routes>
        <Location />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('polish route')).toBeInTheDocument());
    expect(screen.getByText('/pl/?from=bookmark#top')).toBeInTheDocument();
  });

  it('keeps the default locale and non-root paths on the English layout', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LocaleEntryLayout />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('locale:en')).toBeInTheDocument();

    unmount();
    render(
      <MemoryRouter initialEntries={['/compendium/']}>
        <Routes>
          <Route path="/compendium/" element={<LocaleEntryLayout />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('locale:en')).toBeInTheDocument();
  });
});
