import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from './model';
import { CharacterSettingsModal } from './CharacterSettingsModal';

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
}));

vi.mock('./layoutStore', () => ({
  useLayoutStore: (selector: (state: typeof mocks) => unknown) => selector(mocks),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

describe('CharacterSettingsModal', () => {
  beforeEach(() => {
    mocks.reset.mockReset();
  });

  it('updates spellcasting, slots and preferences', () => {
    const character = createCharacter('Hero');
    const update = vi.fn();
    const view = render(
      <CharacterSettingsModal character={character} update={update} onClose={vi.fn()} />,
    );

    const ability = screen.getByRole('combobox');
    fireEvent.change(ability, { target: { value: 'int' } });
    expect(update).toHaveBeenCalledWith({ spellcastingAbility: 'int' });
    fireEvent.change(ability, { target: { value: '' } });
    expect(update).toHaveBeenCalledWith({ spellcastingAbility: null });

    const slots = screen.getAllByRole('spinbutton');
    fireEvent.change(slots[0]!, { target: { value: '-3' } });
    fireEvent.change(slots[1]!, { target: { value: '4' } });
    fireEvent.change(slots[0]!, { target: { value: '' } });
    fireEvent.change(slots[1]!, { target: { value: '' } });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ spellSlots: expect.any(Array) }),
    );

    const preferences = screen.getAllByRole('checkbox');
    fireEvent.click(preferences[0]!);
    fireEvent.click(preferences[1]!);
    expect(update).toHaveBeenCalledWith({ autoSyncFeatures: false });
    expect(update).toHaveBeenCalledWith({ role: 'dm' });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'character.sheet.settingsModal.resetLayout',
      }),
    );
    expect(mocks.reset).toHaveBeenCalled();

    view.rerender(
      <CharacterSettingsModal
        character={{ ...character, role: 'dm' }}
        update={update}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox')[1]!);
    expect(update).toHaveBeenCalledWith({ role: 'party' });
  });

  it('closes from the backdrop, button and Escape but not inner clicks', () => {
    const onClose = vi.fn();
    const view = render(
      <CharacterSettingsModal
        character={createCharacter()}
        update={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('heading', { level: 2 }).parentElement!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'character.sheet.settingsModal.close',
      }),
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(3);

    view.unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
