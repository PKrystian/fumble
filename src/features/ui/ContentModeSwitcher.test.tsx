import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useContentModeStore } from './contentModeStore';
import { ContentModeSwitcher } from './ContentModeSwitcher';

describe('ContentModeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    useContentModeStore.setState({ mode: 'all' });
  });

  it('opens from pointer and keyboard input and selects an edition', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ContentModeSwitcher />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Content edition' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const all = screen.getByRole('option', { name: 'All content' });
    const current = screen.getByRole('option', { name: 'D&D 2024 & newer' });

    fireEvent.keyDown(all, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(current);
    fireEvent.keyDown(current, { key: 'ArrowUp' });
    fireEvent.keyDown(all, { key: 'Home' });
    fireEvent.keyDown(all, { key: 'End' });
    fireEvent.keyDown(all, { key: 'x' });
    fireEvent.keyDown(all, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('option', { name: 'D&D 2014 only' }), {
      key: ' ',
    });
    expect(useContentModeStore.getState().mode).toBe('2014');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports compact mode, pointer selection and outside dismissal', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ContentModeSwitcher compact />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'Content edition' });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('listbox'));
    fireEvent.click(screen.getByRole('option', { name: 'D&D 2024 & newer' }));
    expect(useContentModeStore.getState().mode).toBe('2024');

    fireEvent.click(trigger);
    fireEvent.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
