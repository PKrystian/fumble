import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterListPage } from './CharacterListPage';

const mocks = vi.hoisted(() => ({
  characters: [] as Array<{
    id: string;
    name: string;
    level: number;
    portrait?: string;
    className?: string;
    species?: string;
    dm?: boolean;
  }>,
  addCharacter: vi.fn(),
  saveCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  navigate: vi.fn(),
  setLayout: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn(),
}));

vi.mock('./store', () => ({
  useCharacterList: () => mocks.characters,
  useCharacterStore: (
    selector: (state: {
      addCharacter: typeof mocks.addCharacter;
      saveCharacter: typeof mocks.saveCharacter;
      deleteCharacter: typeof mocks.deleteCharacter;
    }) => unknown,
  ) =>
    selector({
      addCharacter: mocks.addCharacter,
      saveCharacter: mocks.saveCharacter,
      deleteCharacter: mocks.deleteCharacter,
    }),
}));

vi.mock('./layoutStore', () => ({
  useLayoutStore: { setState: (...args: unknown[]) => mocks.setLayout(...args) },
}));

vi.mock('./model', () => ({
  isDmCharacter: (character: { dm?: boolean }) => character.dm,
}));

vi.mock('@/features/ui/confirmStore', () => ({
  confirmDialog: (...args: unknown[]) => mocks.confirm(...args),
  alertDialog: (...args: unknown[]) => mocks.alert(...args),
}));

vi.mock('@/i18n/path', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

const upload = (input: HTMLInputElement, body: string) => {
  const file = new File([body], 'character.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: vi.fn().mockResolvedValue(body),
  });
  fireEvent.change(input, { target: { files: [file] } });
};

describe('CharacterListPage', () => {
  beforeEach(() => {
    mocks.characters = [];
    mocks.addCharacter.mockReset();
    mocks.addCharacter.mockReturnValue('new-id');
    mocks.saveCharacter.mockReset();
    mocks.deleteCharacter.mockReset();
    mocks.navigate.mockReset();
    mocks.setLayout.mockReset();
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
    mocks.alert.mockReset();
    mocks.alert.mockResolvedValue(undefined);
  });

  it('shows the empty state and creates a character', () => {
    render(<CharacterListPage />);
    expect(screen.getByText('character.list.emptyState')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'character.list.newCharacter' }));
    expect(mocks.addCharacter).toHaveBeenCalledWith('character.list.newCharacter');
    expect(mocks.navigate).toHaveBeenCalledWith('/character/new-id');
  });

  it('renders, opens and deletes populated character cards', async () => {
    mocks.characters = [
      {
        id: 'hero',
        name: 'Hero',
        level: 5,
        portrait: 'data:image/png;base64,x',
        className: 'Wizard',
        species: 'Elf',
      },
      { id: 'dm', name: '', level: 1, dm: true },
    ];
    render(<CharacterListPage />);
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'data:image/png;base64,x',
    );
    expect(screen.getByText('character.unnamed')).toBeInTheDocument();
    expect(screen.getByText('character.dmBadge')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'character.list.title' })).toHaveClass(
      'text-2xl',
      'sm:text-3xl',
    );
    expect(screen.getByRole('button', { name: 'character.list.import' })).toHaveClass(
      'w-full',
      'sm:w-auto',
    );
    expect(
      screen.getAllByRole('button', { name: 'character.list.deleteLabel' })[0],
    ).not.toHaveClass('opacity-0');
    fireEvent.click(screen.getByRole('button', { name: /Hero/ }));
    expect(mocks.navigate).toHaveBeenCalledWith('/character/hero');

    fireEvent.click(
      screen.getAllByRole('button', { name: 'character.list.deleteLabel' })[0]!,
    );
    await waitFor(() => expect(mocks.deleteCharacter).toHaveBeenCalledWith('hero'));
    mocks.confirm.mockResolvedValue(false);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'character.list.deleteLabel' })[1]!,
    );
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.deleteCharacter).toHaveBeenCalledTimes(1);
  });

  it('imports wrapped and direct character exports', async () => {
    const view = render(<CharacterListPage />);
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'character.list.import' }));
    expect(click).toHaveBeenCalled();

    upload(
      input,
      JSON.stringify({
        version: 1,
        character: { id: 'wrapped', name: 'Wrapped' },
        layout: { left: ['stats'], center: [], right: [] },
      }),
    );
    await waitFor(() =>
      expect(mocks.saveCharacter).toHaveBeenCalledWith({
        id: 'wrapped',
        name: 'Wrapped',
      }),
    );
    expect(mocks.setLayout).toHaveBeenCalled();

    upload(input, JSON.stringify({ id: 'direct', name: 'Direct' }));
    await waitFor(() =>
      expect(mocks.saveCharacter).toHaveBeenCalledWith({
        id: 'direct',
        name: 'Direct',
      }),
    );
  });

  it('reports malformed and incomplete imports and ignores empty selection', async () => {
    const view = render(<CharacterListPage />);
    const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [] } });
    upload(input, '{');
    upload(input, JSON.stringify({ id: 'missing-name' }));
    await waitFor(() => expect(mocks.alert).toHaveBeenCalledTimes(2));
    expect(mocks.saveCharacter).not.toHaveBeenCalled();
  });
});
