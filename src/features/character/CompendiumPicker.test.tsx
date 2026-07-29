import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompendiumPicker, CompendiumSelectModalField } from './CompendiumPicker';

const mocks = vi.hoisted(() => ({
  status: 'ready' as 'loading' | 'ready' | 'error',
  items: [] as Array<{
    id: string;
    name: string;
    source: string;
    srd: boolean;
    hidden?: boolean;
  }>,
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: () => ({ id: 'species' }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({ status: mocks.status, items: mocks.items }),
}));

const entries = [
  { id: 'elf', name: 'Elf', source: 'XPHB', srd: true },
  { id: 'dwarf', name: 'Dwarf', source: 'PHB', srd: true },
  { id: 'hidden', name: 'Hidden', source: 'HB', srd: true, hidden: true },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `other-${index}`,
    name: `Other ${index}`,
    source: 'XPHB',
    srd: true,
  })),
];

function wrapper(children: ReactNode) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('CompendiumPicker', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.items = entries;
  });

  it('searches, limits results, filters sources and picks an item', () => {
    const onPick = vi.fn();
    render(
      wrapper(
        <CompendiumPicker
          categoryId="species"
          placeholder="Find species"
          onPick={onPick}
        />,
      ),
    );
    const input = screen.getByRole('searchbox', { name: 'Find species' });
    fireEvent.change(input, { target: { value: 'other' } });
    expect(screen.getAllByRole('button', { name: /Other/ })).toHaveLength(8);

    fireEvent.click(screen.getByRole('button', { name: 'Filter by source' }));
    fireEvent.click(screen.getByRole('button', { name: "Player's Handbook (2014)" }));
    expect(screen.queryByRole('button', { name: /Other 0/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "Player's Handbook (2014)" }));
    fireEvent.change(input, { target: { value: 'elf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Elf' }));
    expect(onPick).toHaveBeenCalledWith(entries[0]);
    expect(input).toHaveValue('');
  });

  it('shows a loading placeholder and no source button for one source', () => {
    mocks.status = 'loading';
    mocks.items = [entries[0]!];
    render(
      wrapper(
        <CompendiumPicker
          categoryId="species"
          placeholder="Find species"
          onPick={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Loading compendium…',
    );
    expect(
      screen.queryByRole('button', { name: 'Filter by source' }),
    ).not.toBeInTheDocument();
  });
});

describe('CompendiumSelectModalField', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.items = entries;
  });

  it('resolves values by id, searches visible entries and selects one', () => {
    const onChange = vi.fn();
    render(
      wrapper(
        <CompendiumSelectModalField
          label="Species"
          categoryId="species"
          value="elf"
          onChange={onChange}
          placeholder="Search species"
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Species: Elf' }));
    expect(screen.queryByRole('button', { name: 'Hidden' })).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search species' });
    fireEvent.change(search, { target: { value: 'dwa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dwarf' }));
    expect(onChange).toHaveBeenCalledWith('dwarf');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resolves a legacy name and closes by button, Escape and backdrop', () => {
    render(
      wrapper(
        <CompendiumSelectModalField
          label="Species"
          categoryId="species"
          value=" ELF "
          onChange={vi.fn()}
          placeholder="Search species"
        />,
      ),
    );
    const open = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Species: Elf' }));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    open();
    fireEvent.keyDown(window, { key: 'Escape' });
    open();
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows none selected, loading and no matches', () => {
    mocks.status = 'loading';
    render(
      wrapper(
        <CompendiumSelectModalField
          label="Species"
          categoryId="species"
          value=""
          onChange={vi.fn()}
          placeholder="Search species"
        />,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Species: None selected' }));
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Loading…');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });
});
