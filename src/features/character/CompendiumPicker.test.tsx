import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CompendiumPicker,
  CompendiumSelectField,
  PICKER_LIMIT,
} from './CompendiumPicker';

const mocks = vi.hoisted(() => ({
  status: 'ready' as 'ready' | 'loading',
  items: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (id: string) => ({ id }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({ status: mocks.status, items: mocks.items }),
}));

const item = (id: string, name: string, source = 'XPHB', extra = {}) => ({
  id,
  name,
  source,
  srd: true,
  ...extra,
});

function renderPicker(onPick = vi.fn(), accept?: (entry: { id: string }) => boolean) {
  render(
    <MemoryRouter initialEntries={['/character/x']}>
      <CompendiumPicker
        categoryId="spells"
        label="Add a spell"
        placeholder="Search spells"
        onPick={onPick}
        describe={(entry) => `meta ${entry.id}`}
        {...(accept ? { accept } : {})}
      />
    </MemoryRouter>,
  );
  return { onPick, input: screen.getByRole('combobox', { name: 'Add a spell' }) };
}

describe('CompendiumPicker', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.items = [
      item('fire-bolt', 'Fire Bolt'),
      item('fireball', 'Fireball', 'PHB'),
      item('kula', 'Kula Ognia', 'XPHB', { englishName: 'Fireball' }),
      item('light', 'Light'),
    ];
  });

  it('selects results with arrows and Enter and announces additions', () => {
    const { input, onPick } = renderPicker();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    fireEvent.change(input, { target: { value: 'fire' } });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      "Fire Boltmeta fire-bolt - Player's Handbook (2024)",
      "Fireballmeta fireball - Player's Handbook (2014)",
      "Kula Ogniameta kula - Player's Handbook (2024)",
    ]);
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Home' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'End' });
    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'kula' }));
    expect(input).toHaveValue('');
    expect(screen.getByText('Kula Ognia added.')).toBeInTheDocument();
  });

  it('picks with the mouse, filters sources and explains empty and limited results', () => {
    const { input, onPick } = renderPicker();
    fireEvent.change(input, { target: { value: 'ognia' } });
    fireEvent.mouseMove(screen.getByRole('option'));
    fireEvent.mouseDown(screen.getByRole('option'));
    fireEvent.click(screen.getByRole('option'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'kula' }));

    const filter = screen.getByRole('button', { name: 'Filter by source' });
    fireEvent.click(filter);
    expect(filter).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: "Player's Handbook (2014)" }));
    expect(filter).toHaveTextContent('1');
    fireEvent.change(input, { target: { value: 'light' } });
    expect(
      screen.getByText('No matches. Try another name or clear the source filter.'),
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: "Player's Handbook (2014)" }));
    fireEvent.click(screen.getByRole('button', { name: "Player's Handbook (2014)" }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear sources' }));
    expect(screen.getAllByRole('option')).toHaveLength(1);

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.change(input, { target: { value: 'light' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    mocks.items = Array.from({ length: PICKER_LIMIT + 5 }, (_, index) =>
      item(`spell-${index}`, `Spell ${String(index).padStart(2, '0')}`),
    );
  });

  it('limits long result lists and honours accept and loading states', () => {
    mocks.items = Array.from({ length: PICKER_LIMIT + 5 }, (_, index) =>
      item(`spell-${index}`, `Spell ${String(index).padStart(2, '0')}`),
    );
    const { input } = renderPicker(vi.fn(), (entry) => entry.id !== 'spell-0');
    fireEvent.change(input, { target: { value: 'spell' } });
    expect(screen.getAllByRole('option')).toHaveLength(PICKER_LIMIT);
    expect(
      screen.getByText(
        `Showing the first ${PICKER_LIMIT} of ${PICKER_LIMIT + 4} matches. Type more to narrow the list.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Filter by source' })).toBeNull();
  });

  it('shows a loading placeholder', () => {
    mocks.status = 'loading';
    const { input } = renderPicker();
    expect(input).toHaveAttribute('placeholder', 'Loading compendium...');
    fireEvent.change(input, { target: { value: 'fire' } });
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('falls back to the placeholder as its name', () => {
    render(
      <MemoryRouter>
        <CompendiumPicker categoryId="items" placeholder="Find items" onPick={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('combobox', { name: 'Find items' })).toBeInTheDocument();
  });
});

describe('CompendiumSelectField', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.items = [
      item('dwarf', 'Krasnolud', 'XPHB', { englishName: 'Dwarf' }),
      item('elf', 'Elf'),
      item('hidden', 'Hidden', 'XPHB', { hidden: true }),
    ];
  });

  function renderField(value: string, onChange = vi.fn()) {
    render(
      <MemoryRouter initialEntries={['/character/x']}>
        <button type="button">before</button>
        <CompendiumSelectField
          label="Species"
          categoryId="species"
          value={value}
          onChange={onChange}
          placeholder="Search species..."
        />
      </MemoryRouter>,
    );
    return onChange;
  }

  it('searches localized and English names with Polish normalization', () => {
    const onChange = renderField('dwarf');
    const trigger = screen.getByRole('button', { name: 'Species: Krasnolud' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Species' });
    expect(dialog).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search species...' });
    fireEvent.change(search, { target: { value: 'dwarf' } });
    expect(within(dialog).getByRole('button', { name: /Krasnolud/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.change(search, { target: { value: 'krasnołud' } });
    fireEvent.change(search, { target: { value: 'f' } });
    expect(
      within(dialog).getAllByRole('button', { name: /^(Elf|Krasnolud)/ })[0],
    ).toHaveTextContent('Elf');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear search' }));
    expect(search).toHaveValue('');
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });
    expect(within(dialog).queryByRole('button', { name: /Hidden/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Elf/ }));
    expect(onChange).toHaveBeenCalledWith('elf');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clears the selection, resolves legacy names and closes in several ways', () => {
    const onChange = renderField('Dwarf');
    fireEvent.click(screen.getByRole('button', { name: 'Species: Krasnolud' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(onChange).toHaveBeenCalledWith('');
    fireEvent.click(screen.getByRole('button', { name: 'Species: Krasnolud' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Species: Krasnolud' }));
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows unknown values, none selected and loading states', () => {
    renderField('Custom species');
    expect(
      screen.getByRole('button', { name: 'Species: Custom species' }),
    ).toBeInTheDocument();
  });

  it('shows an empty selection while loading', () => {
    mocks.status = 'loading';
    mocks.items = [];
    renderField('');
    fireEvent.click(screen.getByRole('button', { name: 'Species: None selected' }));
    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull();
  });
});
