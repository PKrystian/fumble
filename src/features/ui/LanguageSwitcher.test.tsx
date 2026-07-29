import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

function Location() {
  const location = useLocation();
  return <output>{location.pathname + location.search}</output>;
}

function renderSwitcher(compact = false) {
  return render(
    <MemoryRouter initialEntries={['/compendium?q=spell']}>
      <LanguageSwitcher compact={compact} />
      <Location />
    </MemoryRouter>,
  );
}

describe('LanguageSwitcher', () => {
  it('opens, keeps the current locale and navigates to another locale', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: 'Change language' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'English' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: 'Polski' }));
    expect(screen.getByText('/pl/compendium/?q=spell')).toBeInTheDocument();
  });

  it('closes from Escape and an outside click but not an inside click', () => {
    renderSwitcher(true);
    const trigger = screen.getByRole('button', { name: 'Change language' });
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
