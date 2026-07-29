import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EncounterCalculatorPage } from './EncounterCalculatorPage';

const mocks = vi.hoisted(() => ({
  status: 'ready',
  rating: 'Trivial',
  items: [] as Array<{
    id: string;
    name: string;
    cr: string;
    hidden?: boolean;
  }>,
}));

vi.mock('./xp', async (importOriginal) => {
  const original = await importOriginal<typeof import('./xp')>();
  return {
    ...original,
    rateEncounter: () => mocks.rating,
  };
});

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({ status: mocks.status, items: mocks.items }),
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: () => ({ id: 'bestiary' }),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      values?.name ? `${key}:${values.name}` : key,
  }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

const monster = (id: string, name: string, hidden = false) => ({
  id,
  name,
  cr: '1',
  hidden,
});

describe('EncounterCalculatorPage', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.rating = 'Trivial';
    mocks.items = [];
  });

  it('edits party groups and handles numeric fallbacks', () => {
    render(<EncounterCalculatorPage />);

    const count = screen.getByLabelText('encounter.count');
    const level = screen.getByLabelText('encounter.level');
    fireEvent.change(count, { target: { value: '' } });
    fireEvent.change(level, { target: { value: '' } });
    expect(count).toHaveValue(0);
    expect(level).toHaveValue(1);

    fireEvent.click(screen.getByRole('button', { name: 'encounter.addLevelGroup' }));
    expect(screen.getAllByLabelText('encounter.count')).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText('encounter.count')[1]!, {
      target: { value: '3' },
    });
    fireEvent.change(screen.getAllByLabelText('encounter.level')[1]!, {
      target: { value: '5' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'encounter.removePartyGroup' })[0]!,
    );
    expect(screen.getAllByLabelText('encounter.count')).toHaveLength(1);
    expect(screen.getByLabelText('encounter.count')).toHaveValue(3);
  });

  it('filters search results, adds counts and removes monsters', () => {
    mocks.items = [
      monster('hidden', 'Hidden Goblin', true),
      ...Array.from({ length: 10 }, (_, index) =>
        monster(`goblin-${index}`, `Goblin ${index}`),
      ),
    ];
    render(<EncounterCalculatorPage />);

    const search = screen.getByLabelText('encounter.searchMonsters');
    fireEvent.change(search, { target: { value: '  GOBLIN  ' } });
    expect(screen.getAllByRole('button', { name: /Goblin/ })).toHaveLength(8);
    expect(screen.queryByText('Hidden Goblin')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Goblin 0/ }));
    expect(screen.getByText('Goblin 0')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'goblin 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Goblin 1/ }));
    fireEvent.change(search, { target: { value: 'goblin 0' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Goblin 0/ })[0]!);
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'encounter.more:Goblin 0' }));
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'encounter.fewer:Goblin 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'encounter.fewer:Goblin 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'encounter.fewer:Goblin 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'encounter.fewer:Goblin 1' }));
    expect(screen.getByText('encounter.noMonstersYet')).toBeInTheDocument();
  });

  it('shows the loading placeholder and clears empty searches', () => {
    mocks.status = 'loading';
    mocks.rating = 'Unknown';
    mocks.items = [monster('dragon', 'Dragon')];
    render(<EncounterCalculatorPage />);

    const search = screen.getByLabelText('encounter.searchMonsters');
    expect(search).toHaveAttribute('placeholder', 'encounter.loadingBestiary');
    fireEvent.change(search, { target: { value: 'dragon' } });
    expect(screen.getByText('Dragon')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: ' ' } });
    expect(screen.queryByText('Dragon')).not.toBeInTheDocument();
    expect(screen.getByText('encounter.trivial')).toBeInTheDocument();
  });
});
