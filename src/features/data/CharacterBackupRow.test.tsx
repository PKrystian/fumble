import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHARACTERS_KEY,
  characterFileText,
  serializeCharacters,
} from '@/features/character/characterData';
import { DEFAULT_ZONES, useLayoutStore } from '@/features/character/layoutStore';
import { createCharacter, type Character } from '@/features/character/model';
import { useCharacterStore } from '@/features/character/store';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { useDialogStore } from '@/features/ui/confirmStore';
import { CharacterBackupRow } from './CharacterBackupRow';

const mocks = vi.hoisted(() => ({ download: vi.fn(), change: vi.fn() }));

vi.mock('@/features/storage/downloadFile', () => ({
  downloadTextFile: (...args: unknown[]) => mocks.download(...args),
}));

function seed(characters: Character[]) {
  localStorage.setItem(
    CHARACTERS_KEY,
    serializeCharacters({
      characters: Object.fromEntries(characters.map((c) => [c.id, c])),
      order: characters.map((c) => c.id),
    }),
  );
  useCharacterStore.getState().reloadStored();
}

function Harness({ busy }: { busy: boolean }) {
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  return (
    <MemoryRouter>
      <ul>
        <CharacterBackupRow
          busy={busy}
          notify={(text, error = false) => setMessage({ text, error })}
          onChange={mocks.change}
        />
      </ul>
      {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
      <ConfirmDialog />
    </MemoryRouter>
  );
}
const mount = (busy = false) => render(<Harness busy={busy} />);

function hero(name: string, changes: Partial<Character> = {}): Character {
  return { ...createCharacter(name), ...changes };
}

function upload(text: string, name = 'characters.json') {
  const file = new File([text], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => text });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  return act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

async function answer(value: boolean) {
  await act(async () => useDialogStore.getState().respond(value));
}

function names() {
  const { characters, order } = useCharacterStore.getState();
  return order.map((id) => characters[id]!.name);
}

describe('CharacterBackupRow', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.download.mockReset();
    mocks.change.mockReset();
    useLayoutStore.getState().reset();
    seed([]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports every character with the panel layout and reports failures', () => {
    const first = mount();
    expect(screen.getByText('Characters: 0')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Characters: download a backup' }),
    ).toBeDisabled();
    first.unmount();
    seed([hero('Mira')]);
    mount();
    expect(screen.getByRole('link', { name: 'Characters' })).toHaveAttribute(
      'href',
      '/character/',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Characters: download a backup' }),
    );
    expect(mocks.download).toHaveBeenLastCalledWith(
      expect.stringContaining('"layout"'),
      'fumble-characters.json',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Download of all characters started.',
    );
    mocks.download.mockImplementation(() => {
      throw new Error('blocked');
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Characters: download a backup' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The file could not be created.');
  });

  it('disables its actions while busy or while storage needs recovery', () => {
    seed([hero('Mira')]);
    const busy = mount(true);
    expect(
      screen.getByRole('button', { name: 'Characters: import from a file' }),
    ).toBeDisabled();
    busy.unmount();
    localStorage.setItem(CHARACTERS_KEY, '{broken');
    useCharacterStore.getState().reloadStored();
    mount();
    expect(screen.getByText(/needs attention/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Characters: import from a file' }),
    ).toBeDisabled();
  });

  it('previews imports and adds duplicates as copies', async () => {
    const mira = hero('Mira');
    seed([mira]);
    mount();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.click(
      screen.getByRole('button', { name: 'Characters: import from a file' }),
    );
    expect(click).toHaveBeenCalled();
    await upload(
      characterFileText([{ ...mira, name: 'Mira v2' }, hero('Nowa'), hero(' ')], {
        zones: DEFAULT_ZONES,
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Import characters' });
    expect(within(dialog).getByText('Character collection')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Already saved', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('radio', { name: /Add as new characters/ }),
    ).toBeChecked();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /panel layout/ }));
    useLayoutStore.getState().movePanel('skills', 'left', 0);
    expect(within(dialog).getByText('Unnamed')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Import 3' }));
    expect(names()).toEqual(['Mira', 'Mira v2 (copy)', 'Nowa', ' ']);
    expect(useLayoutStore.getState().zones).toEqual(DEFAULT_ZONES);
    expect(screen.getByText('Imported 3 characters.')).toBeInTheDocument();
  });

  it('replaces matching characters only after confirmation', async () => {
    const mira = hero('Mira');
    seed([mira, hero('Ola')]);
    mount();
    await upload(JSON.stringify({ version: 1, character: { ...mira, name: 'Mira v2' } }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Single character')).toBeInTheDocument();
    expect(within(dialog).getByText('Unknown')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Replace matching/ }));
    expect(within(dialog).getByText(/cannot be recovered/)).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Download current characters' }),
    );
    expect(mocks.download).toHaveBeenCalledWith(
      expect.any(String),
      'fumble-characters-current.json',
    );
    expect(within(dialog).getByText('Download started.')).toBeInTheDocument();
    mocks.download.mockImplementationOnce(() => {
      throw new Error('blocked');
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Download current characters' }),
    );
    expect(
      within(dialog).getByText('The file could not be created.'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace and import' }));
    await answer(false);
    expect(names()).toEqual(['Mira', 'Ola']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace and import' }));
    expect(useDialogStore.getState().request?.message).toBe(
      'Replace 1 saved characters with the versions from this file?',
    );
    await answer(true);
    expect(names()).toEqual(['Mira v2', 'Ola']);
  });

  it('restores characters from a full backup and acknowledges empty files', async () => {
    seed([hero('Mira')]);
    mount();
    await upload(
      JSON.stringify({
        app: 'fumble',
        version: 1,
        exportedAt: '2026-11-10T10:00:00.000Z',
        data: { [CHARACTERS_KEY]: serializeCharacters({ characters: {}, order: [] }) },
      }),
      'backup.json',
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Full Fumble backup')).toBeInTheDocument();
    expect(
      within(dialog).getByText('This file does not contain any characters.'),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole('checkbox', { name: /panel layout/ })).toBeNull();
    const add = within(dialog).getByRole('button', { name: 'Import 0' });
    expect(add).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Replace all/ }));
    const replace = within(dialog).getByRole('button', { name: 'Replace and import' });
    expect(replace).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /will be removed/ }));
    fireEvent.click(replace);
    expect(useDialogStore.getState().request?.message).toBe(
      'Remove all 1 saved characters and import this file?',
    );
    await answer(true);
    expect(names()).toEqual([]);
  });

  it('lists only the first ten imported characters and cancels the preview', async () => {
    seed([]);
    mount();
    await upload(
      characterFileText(Array.from({ length: 12 }, (_, index) => hero(`Hero ${index}`))),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('and 2 more')).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(names()).toEqual([]);
  });

  it('reports invalid, empty and oversized files', async () => {
    mount();
    await upload('{broken', 'broken.json');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'broken.json is not a valid Fumble character or backup file.',
    );
    await upload('{"app":"fumble","data":{}}', 'empty.json');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'empty.json does not contain characters.',
    );
    await upload('x'.repeat(10 * 1024 * 1024 + 1), 'huge.json');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'huge.json is larger than 10 MB.',
    );
    await upload('{"id":"x","abilities":"nope"}', 'bad.json');
    expect(screen.getByRole('alert')).toHaveTextContent('bad.json is not a valid');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    const thrower = new File(['x'], 'odd.json');
    Object.defineProperty(thrower, 'text', { value: async () => Promise.reject('odd') });
    await act(async () => {
      fireEvent.change(input, { target: { files: [thrower] } });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('odd.json is not a valid');
  });
});
