import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import type { CategoryFilter } from './categories';
import { FilterBar } from './FilterBar';

const sizeFilter: CategoryFilter = {
  id: 'size',
  label: 'compendium.filters.labels.size',
  valuesFor: (item: CompendiumEntryBase) => [
    (item as CompendiumEntryBase & { size: string }).size,
  ],
  sortKey: (value: string) => Number(value.replace('Size ', '')),
};

const sourceFilter: CategoryFilter = {
  id: 'source',
  label: 'compendium.filters.labels.source',
  valuesFor: (item: CompendiumEntryBase) => [item.source],
  labelFor: (value: string) => (value === 'XPHB' ? 'Core Book' : value),
};

const items = [
  ...Array.from({ length: 18 }, (_, index) => ({
    id: `item-${index}`,
    name: `Item ${index}`,
    source: index === 0 ? 'Homebrew' : 'XPHB',
    srd: true,
    size: `Size ${index + 1}`,
  })),
];

function setup(
  selected: Record<string, string[]> = {},
  filters: CategoryFilter[] = [sizeFilter, sourceFilter],
  availableItems = items,
) {
  const props = {
    filters,
    items: availableItems,
    selected,
    onToggle: vi.fn(),
    onSetFilter: vi.fn(),
    onClear: vi.fn(),
    onRandom: vi.fn(),
    sortField: 'name',
    sortDir: 'asc' as const,
    onSortField: vi.fn(),
    onToggleSortDir: vi.fn(),
  };
  return {
    ...render(
      <MemoryRouter>
        <FilterBar {...props} />
      </MemoryRouter>,
    ),
    props,
  };
}

describe('FilterBar', () => {
  it('opens facets, expands values, searches and invokes selection actions', () => {
    const { props } = setup({ size: ['Size 1'], source: ['XPHB'] });
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByText('Core/Supplements')).toBeInTheDocument();
    expect(screen.getAllByText('Homebrew')).toHaveLength(2);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Core Book' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Homebrew' }));

    fireEvent.click(screen.getByRole('button', { name: 'Show all (18)' }));
    expect(screen.getByRole('button', { name: 'Size 18' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search filter options' }), {
      target: { value: 'Size 18' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox', { name: 'Search filter options' })).toHaveValue(
      '',
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search filter options' }), {
      target: { value: 'Size 18' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Size 18' }));
    expect(props.onToggle).toHaveBeenCalledWith('size', 'Size 18');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search filter options' }), {
      target: { value: '' },
    });
    for (const button of screen.getAllByRole('button', { name: 'All' })) {
      fireEvent.click(button);
    }
    for (const button of screen.getAllByRole('button', { name: 'Clear' })) {
      fireEvent.click(button);
    }
    expect(props.onToggle).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(props.onClear).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('controls sorting, random choice, reset and active summary chips', () => {
    const { props } = setup({ size: ['Size 1'], source: ['XPHB'] });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'size' },
    });
    expect(props.onSortField).toHaveBeenCalledWith('size');
    fireEvent.click(screen.getByRole('button', { name: 'Sorted ascending' }));
    expect(props.onToggleSortDir).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Jump to a random entry' }));
    expect(props.onRandom).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(props.onClear).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle filter summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Size 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Core Book' }));
    expect(props.onToggle).toHaveBeenCalledWith('size', 'Size 1');
    expect(props.onToggle).toHaveBeenCalledWith('source', 'XPHB');
  });

  it('updates all visible values in one operation', () => {
    const { props } = setup({ size: ['Size 1'] });
    fireEvent.click(screen.getByRole('button', { name: /^Filters/ }));

    const allButtons = screen.getAllByRole('button', { name: 'All' });
    fireEvent.click(allButtons.at(-1)!);
    expect(props.onSetFilter).toHaveBeenCalledWith(
      'size',
      expect.arrayContaining(['Size 1', 'Size 18']),
    );
    expect(props.onSetFilter).toHaveBeenCalledTimes(1);

    const clearButtons = screen.getAllByRole('button', { name: 'Clear' });
    fireEvent.click(clearButtons.at(-1)!);
    expect(props.onSetFilter).toHaveBeenLastCalledWith('size', []);
    expect(props.onSetFilter).toHaveBeenCalledTimes(2);
  });

  it('closes the modal with Escape and the backdrop', () => {
    setup();
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    open();
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders descending sort state and disables reset without selections', () => {
    const initial = setup();
    const props = {
      ...initial.props,
      sortDir: 'desc' as const,
    };
    initial.rerender(
      <MemoryRouter>
        <FilterBar {...props} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Sorted descending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeDisabled();
  });

  it('handles missing and single source groups', () => {
    const missing = setup({}, [sizeFilter]);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.queryByText('Core/Supplements')).not.toBeInTheDocument();
    missing.unmount();

    const core = setup(
      {},
      [sourceFilter],
      items.filter((item) => item.source === 'XPHB'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByText('Core/Supplements')).toBeInTheDocument();
    expect(screen.queryByText('Homebrew')).not.toBeInTheDocument();
    core.unmount();

    setup(
      {},
      [sourceFilter],
      items.filter((item) => item.source === 'Homebrew'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getAllByText('Homebrew')).not.toHaveLength(0);
    expect(screen.queryByText('Core/Supplements')).not.toBeInTheDocument();
  });
});
