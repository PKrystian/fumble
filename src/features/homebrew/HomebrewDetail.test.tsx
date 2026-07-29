import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { HomebrewCompendiumItem } from './store';
import { HomebrewDetail } from './HomebrewDetail';

const item = (overrides: Partial<HomebrewCompendiumItem> = {}): HomebrewCompendiumItem =>
  Object.assign(
    {
      id: 'hb-test',
      name: 'Test Brew',
      source: 'Homebrew',
      srd: false,
      _homebrew: true as const,
      _manual: true,
      subtitle: '',
      entries: [],
    },
    overrides,
  );

describe('HomebrewDetail', () => {
  it('renders the label without optional content', () => {
    render(
      <MemoryRouter>
        <HomebrewDetail item={item()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Test Brew' })).toBeInTheDocument();
    expect(screen.getByText('Homebrew')).toBeInTheDocument();
  });

  it('renders a subtitle and entries', () => {
    render(
      <MemoryRouter>
        <HomebrewDetail
          item={item({ subtitle: 'Custom option', entries: ['Custom description'] })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Custom option')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });
});
