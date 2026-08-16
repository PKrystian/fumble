import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    locale: 'en',
    t: (key: string, values?: Record<string, string | number>) =>
      values?.name ? `${key}:${values.name}` : key,
  }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

const monster = (id: string, name: string, hidden = false, habitat = '', cr = '1') => ({
  id,
  name,
  cr,
  hidden,
  habitat,
});

describe('EncounterCalculatorPage', () => {
  const renderPage = (path = '/dm/encounter') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <EncounterCalculatorPage />
      </MemoryRouter>,
    );

  beforeEach(() => {
    mocks.status = 'ready';
    mocks.rating = 'Trivial';
    mocks.items = [];
  });

  it('edits party groups and handles numeric fallbacks', () => {
    renderPage();

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
    renderPage();

    const search = screen.getByLabelText('encounter.searchMonsters');
    fireEvent.change(search, { target: { value: '  GOBLIN  ' } });
    expect(screen.getAllByRole('button', { name: /Goblin/ })).toHaveLength(8);
    expect(screen.queryByText('Hidden Goblin')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Goblin 0/ }));
    expect(screen.getByText('Goblin 0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Goblin 0' })).toHaveAttribute(
      'href',
      expect.stringContaining('/compendium/bestiary/goblin-0'),
    );
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

  it('restores the bestiary search from the URL', () => {
    mocks.items = [monster('dragon', 'Dragon'), monster('goblin', 'Goblin')];
    renderPage('/dm/encounter?q=dragon');
    expect(screen.getByRole('searchbox')).toHaveValue('dragon');
    expect(screen.getByText('Dragon')).toBeInTheDocument();
    expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
  });

  it('filters monsters and options by habitat', () => {
    mocks.items = [
      monster('urban', 'Urban Goblin', false, 'Urban'),
      monster('mountain', 'Mountain Goblin', false, 'Mountain'),
      monster('both', 'Both Goblin', false, 'Mountain, Urban'),
    ];
    renderPage('/dm/encounter?habitat=Urban&q=goblin');

    const habitat = screen.getByLabelText('encounter.habitat');
    expect(habitat).toHaveValue('Urban');
    expect(screen.getByText('Urban Goblin')).toBeInTheDocument();
    expect(screen.getByText('Both Goblin')).toBeInTheDocument();
    expect(screen.queryByText('Mountain Goblin')).not.toBeInTheDocument();

    fireEvent.change(habitat, { target: { value: 'Mountain' } });
    expect(screen.getByText('Mountain Goblin')).toBeInTheDocument();
    expect(screen.getByText('Both Goblin')).toBeInTheDocument();
    expect(screen.queryByText('Urban Goblin')).not.toBeInTheDocument();

    fireEvent.change(habitat, { target: { value: '' } });
    expect(habitat).toHaveValue('');
    expect(screen.getByText('Mountain Goblin')).toBeInTheDocument();
  });

  it('includes monsters with Any habitat when enabled', () => {
    mocks.items = [
      monster('urban', 'Urban Goblin', false, 'Urban'),
      monster('any', 'Any Goblin', false, 'Any'),
      monster('mountain', 'Mountain Goblin', false, 'Mountain'),
    ];
    renderPage('/dm/encounter?habitat=Urban&includeAny=1&q=goblin');

    const includeAny = screen.getByLabelText('encounter.includeAny');
    expect(includeAny).toBeChecked();
    expect(screen.getByText('Urban Goblin')).toBeInTheDocument();
    expect(screen.getByText('Any Goblin')).toBeInTheDocument();
    expect(screen.queryByText('Mountain Goblin')).not.toBeInTheDocument();

    fireEvent.click(includeAny);
    expect(screen.getByText('Urban Goblin')).toBeInTheDocument();
    expect(screen.queryByText('Any Goblin')).not.toBeInTheDocument();
  });

  it('adds a random monster from the party budget and selected habitat', () => {
    mocks.items = [
      monster('weaker', 'Weaker Goblin', false, 'Urban', '3'),
      monster('matching', 'Matching Goblin', false, 'Urban', '4'),
      monster('other-habitat', 'Mountain Goblin', false, 'Mountain', '4'),
      monster('stronger', 'Stronger Goblin', false, 'Urban', '5'),
    ];
    renderPage('/dm/encounter?habitat=Urban');

    fireEvent.change(screen.getByLabelText('encounter.count'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('encounter.level'), {
      target: { value: '4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'encounter.addRandomMonster' }));

    expect(screen.getByText('Matching Goblin')).toBeInTheDocument();
    expect(screen.queryByText('Mountain Goblin')).not.toBeInTheDocument();
    expect(screen.queryByText('Weaker Goblin')).not.toBeInTheDocument();
  });

  it('reports when no stronger random monster is available', () => {
    mocks.items = [monster('weaker', 'Weaker Goblin', false, '', '1')];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'encounter.addRandomMonster' }));

    expect(screen.getByText('encounter.randomMonsterUnavailable')).toBeInTheDocument();
  });

  it('shows the loading placeholder and clears empty searches', () => {
    mocks.status = 'loading';
    mocks.rating = 'Unknown';
    mocks.items = [monster('dragon', 'Dragon')];
    renderPage();

    const search = screen.getByLabelText('encounter.searchMonsters');
    expect(search).toHaveAttribute('placeholder', 'encounter.loadingBestiary');
    fireEvent.change(search, { target: { value: 'dragon' } });
    expect(screen.getByText('Dragon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.clearSearch' }));
    expect(search).toHaveValue('');
    fireEvent.change(search, { target: { value: ' ' } });
    expect(screen.queryByText('Dragon')).not.toBeInTheDocument();
    expect(screen.getByText('encounter.trivial')).toBeInTheDocument();
  });
});
