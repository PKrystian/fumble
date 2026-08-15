import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLocaleStore } from '@/i18n/store';
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
  beforeEach(() => {
    localStorage.clear();
    useLocaleStore.setState({ locale: 'en' });
  });

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
    expect(useLocaleStore.getState().locale).toBe('pl');
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

  it('supports keyboard navigation and selecting the other locale', () => {
    renderSwitcher();
    const trigger = screen.getByRole('button', { name: 'Change language' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const english = screen.getByRole('option', { name: 'English' });
    const polish = screen.getByRole('option', { name: 'Polski' });
    fireEvent.keyDown(english, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(polish);
    fireEvent.keyDown(polish, { key: 'ArrowUp' });
    fireEvent.keyDown(english, { key: 'Home' });
    fireEvent.keyDown(english, { key: 'End' });
    fireEvent.keyDown(english, { key: 'x' });
    fireEvent.keyDown(english, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Polski' }), { key: ' ' });
    expect(useLocaleStore.getState().locale).toBe('pl');
    expect(screen.getByText('/pl/compendium/?q=spell')).toBeInTheDocument();
  });
});
