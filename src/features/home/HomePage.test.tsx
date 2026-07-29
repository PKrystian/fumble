import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the navigation categories', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Player' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dungeon Master' })).toBeInTheDocument();
  });

  it('links to the character sheet', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /character sheet/i })).toHaveAttribute(
      'href',
      '/character',
    );
  });
});
