import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialogStore } from '@/features/ui/confirmStore';
import { CharacterSettingsModal } from './CharacterSettingsModal';
import { DEFAULT_ZONES, useLayoutStore } from './layoutStore';
import { createCharacter, type Character } from './model';

function mount(character: Character, computed: Partial<Character> | null) {
  const update = vi.fn();
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={['/character/x']}>
      <CharacterSettingsModal
        character={character}
        update={update}
        computed={computed}
        onClose={onClose}
      />
    </MemoryRouter>,
  );
  return { update, onClose };
}

async function answer(value: boolean) {
  await act(async () => useDialogStore.getState().respond(value));
}

describe('CharacterSettingsModal', () => {
  beforeEach(() => {
    useLayoutStore.getState().reset();
  });

  it('changes preferences and applies synchronization on request', async () => {
    const character = {
      ...createCharacter('Hero'),
      className: 'barbarian',
      manualFields: ['speed' as const],
    };
    const computed = { speed: { walk: 25, swim: 0, climb: 0, fly: 0 } };
    const { update, onClose } = mount(character, computed);
    expect(
      screen.getByRole('dialog', { name: 'Character Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Automatically fill/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('checkbox', { name: /Automatically fill/ }));
    expect(update).toHaveBeenCalledWith({ autoSyncFeatures: false });
    fireEvent.click(screen.getByRole('checkbox', { name: /DM/ }));
    expect(update).toHaveBeenCalledWith({ role: 'dm' });

    fireEvent.click(screen.getByRole('button', { name: 'Apply data now' }));
    expect(useDialogStore.getState().request?.initialFocus).toBe('cancel');
    await answer(false);
    expect(update).not.toHaveBeenCalledWith(
      expect.objectContaining({ manualFields: [] }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply data now' }));
    await answer(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ speed: computed.speed, manualFields: [] }),
    );
    expect(
      screen.getByText('Class, species, and background data applied.'),
    ).toBeInTheDocument();

    useLayoutStore.getState().movePanel('skills', 'left', 0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset panel layout' }));
    await answer(false);
    expect(useLayoutStore.getState().zones).not.toEqual(DEFAULT_ZONES);
    fireEvent.click(screen.getByRole('button', { name: 'Reset panel layout' }));
    await answer(true);
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
    expect(screen.getByText('Panel layout reset.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables applying data until it is available', () => {
    const { update } = mount({ ...createCharacter('Hero'), role: 'dm' }, null);
    expect(screen.getByRole('button', { name: 'Apply data now' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /DM/ }));
    expect(update).toHaveBeenCalledWith({ role: 'party' });
  });
});
