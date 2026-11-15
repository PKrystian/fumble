import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataManagementPage } from './DataManagementPage';
import { CHARACTERS_KEY, serializeCharacters } from '@/features/character/characterData';
import { createCharacter } from '@/features/character/model';
import { useCharacterStore } from '@/features/character/store';
import { MAX_BACKUP_BYTES, type FumbleBackup } from './backup';
import { useSoundboardStore } from '@/features/soundboard/store';
import { useLootStore } from '@/features/dm/lootStore';
import { useSessionStore } from '@/features/session-log/store';
import {
  HOMEBREW_KEY,
  serializeHomebrew,
  useHomebrewStore,
  type HomebrewManualEntry,
} from '@/features/homebrew/store';
import { emptyLootData, LOOT_KEY } from '@/features/dm/lootData';
import { lootBackup } from '@/features/dm/lootFiles';
import {
  allowSoundboardReplacement,
  saveSoundboard,
  soundboardStorage,
} from '@/features/soundboard/persistence';

const mocks = vi.hoisted(() => ({
  createBackup: vi.fn(),
  parseBackup: vi.fn(),
  serializeBackup: vi.fn(),
  restoreBackup: vi.fn(),
  confirmDialog: vi.fn(),
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
}));

vi.mock('./backup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./backup')>()),
  createBackup: mocks.createBackup,
  parseBackup: mocks.parseBackup,
  serializeBackup: mocks.serializeBackup,
  restoreBackup: mocks.restoreBackup,
}));
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: mocks.confirmDialog }));
vi.mock('@/i18n/useT', () => ({
  useT: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/seo/useSeo', () => ({ useSeo: vi.fn() }));

const backup: FumbleBackup = {
  app: 'fumble',
  version: 1,
  exportedAt: '2026-08-03T12:00:00.000Z',
  data: { 'fumble-sidebar': '{"state":{"collapsed":true},"version":1}' },
};
const emptyBackup: FumbleBackup = { ...backup, data: {} };

function renderPage() {
  return render(
    <MemoryRouter>
      <DataManagementPage />
    </MemoryRouter>,
  );
}
function makeFile(text = 'valid') {
  const file = new File([text], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}
async function selectBackup(file = makeFile()) {
  fireEvent.change(screen.getByLabelText('data.chooseFile'), {
    target: { files: [file] },
  });
  await screen.findByRole('heading', { name: 'data.previewTitle' });
}
function restore() {
  fireEvent.click(screen.getByRole('button', { name: 'data.importAction' }));
}

describe('data management page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    allowSoundboardReplacement();
    useLootStore.setState({
      data: emptyLootData(),
      saved: true,
      blocked: false,
      raw: null,
    });
    mocks.createBackup.mockReturnValue(emptyBackup);
    mocks.parseBackup.mockReturnValue(backup);
    mocks.serializeBackup.mockReturnValue(JSON.stringify(backup));
    mocks.confirmDialog.mockResolvedValue(true);
    mocks.createObjectURL.mockReturnValue('blob:test');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: mocks.createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: mocks.revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('shows local empty data, exports a copy and keeps the file input out of keyboard navigation', () => {
    renderPage();
    expect(screen.getByText('data.currentEmpty')).toBeVisible();
    const input = screen.getByLabelText('data.chooseFile');
    expect(input).toHaveAttribute('hidden');
    const inputClick = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'data.chooseFile' }));
    expect(inputClick).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [] } });
    expect(mocks.parseBackup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(mocks.createObjectURL).toHaveBeenCalledOnce();
    expect(mocks.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(screen.getByText('data.exported')).toBeVisible();
    expect(
      JSON.parse(localStorage.getItem('fumble-backup-reminder')!).state.lastBackupAt,
    ).toBeGreaterThan(0);
  });

  it('includes pending Homebrew changes without changing the stored copy', () => {
    const entry: HomebrewManualEntry = {
      kind: 'manual',
      id: 'hb-draft',
      name: 'Draft',
      category: 'items',
      body: '',
      subtitle: '',
      createdAt: 1,
    };
    const previous = serializeHomebrew([]);
    localStorage.setItem(HOMEBREW_KEY, previous);
    useHomebrewStore.getState().loadStored();
    useHomebrewStore.setState({ entries: [entry], dirty: true, status: 'unsaved' });
    try {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
      expect(mocks.serializeBackup).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: { [HOMEBREW_KEY]: serializeHomebrew([entry]) } }),
      );
      expect(localStorage.getItem(HOMEBREW_KEY)).toBe(previous);
    } finally {
      localStorage.removeItem(HOMEBREW_KEY);
      useHomebrewStore.getState().loadStored();
    }
  });

  it('includes unsaved characters and omits unreadable stored characters', () => {
    const hero = createCharacter('Pending hero');
    useCharacterStore.setState({
      characters: { [hero.id]: hero },
      order: [hero.id],
      dirty: true,
    });
    try {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
      expect(mocks.serializeBackup).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            [CHARACTERS_KEY]: serializeCharacters({
              characters: { [hero.id]: hero },
              order: [hero.id],
            }),
          }),
        }),
      );
    } finally {
      useCharacterStore.setState({ characters: {}, order: [], dirty: false });
    }
    mocks.createBackup.mockReturnValueOnce({
      app: 'fumble',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { [CHARACTERS_KEY]: '{broken' },
    });
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'data.exportAction' }).at(-1)!);
    expect(mocks.serializeBackup).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ [CHARACTERS_KEY]: expect.anything() }),
      }),
    );
  });

  it('shows the last full backup, storage use and a warning near the limit', () => {
    localStorage.clear();
    const first = renderPage();
    expect(screen.getByText('data.lastBackupNever')).toBeVisible();
    expect(screen.getByText('data.usageLow')).toBeVisible();
    expect(screen.queryByText('data.usageWarning')).not.toBeInTheDocument();
    localStorage.setItem('fumble-medium', 'x'.repeat(100_000));
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(screen.queryByText('data.lastBackupNever')).not.toBeInTheDocument();
    expect(screen.getByText('data.usageValue')).toBeVisible();
    first.unmount();

    localStorage.setItem('fumble-large', 'x'.repeat(4_100_000));
    renderPage();
    expect(screen.getByText('data.usageWarning')).toBeVisible();
    localStorage.clear();
  });

  it('includes an unsaved journal, omits an unreadable one and points to its recovery', async () => {
    localStorage.clear();
    await useSessionStore.persist.rehydrate();
    useSessionStore.setState({ sessions: [], contexts: [], selectedSessionId: null });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    useSessionStore.getState().addSession('Only in memory');
    write.mockRestore();
    const first = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    const exported = mocks.serializeBackup.mock.calls.at(-1)![0] as FumbleBackup;
    expect(exported.data['fumble-sessions']).toContain('Only in memory');
    expect(screen.queryByText(/data.sessionsRecovery/)).not.toBeInTheDocument();
    first.unmount();

    localStorage.setItem('fumble-sessions', '{broken');
    await useSessionStore.persist.rehydrate();
    mocks.createBackup.mockReturnValue({
      ...emptyBackup,
      data: { 'fumble-sessions': '{broken' },
    });
    renderPage();
    expect(screen.getByText(/data.sessionsRecovery/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    const safe = mocks.serializeBackup.mock.calls.at(-1)![0] as FumbleBackup;
    expect(safe.data).not.toHaveProperty('fumble-sessions');
    localStorage.clear();
    await useSessionStore.persist.rehydrate();
  });

  it('refreshes the current data after a single tool is restored', async () => {
    localStorage.clear();
    useLootStore.getState().reload();
    renderPage();
    const text = JSON.stringify(lootBackup(emptyLootData()));
    const file = makeFile(text);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'data.tools.restoreNamed' })[4]!,
    );
    fireEvent.change(screen.getByLabelText('data.tools.restore', { selector: 'input' }), {
      target: { files: [file] },
    });
    const preview = await screen.findByRole('group', { name: 'data.tools.previewTitle' });
    fireEvent.click(within(preview).getByRole('checkbox'));
    mocks.createBackup.mockReturnValue(backup);
    fireEvent.click(
      within(preview).getByRole('button', { name: 'data.tools.restoreAction' }),
    );
    expect(await screen.findByText('data.tools.restored')).toBeVisible();
    expect(screen.queryByText('data.currentEmpty')).not.toBeInTheDocument();
    expect(localStorage.getItem(LOOT_KEY)).not.toBeNull();
    localStorage.clear();
    useLootStore.getState().reload();
  });

  it('includes unsaved loot memory in the full backup without changing the stored snapshot', () => {
    useLootStore.setState({ saved: false });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(mocks.serializeBackup).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ [LOOT_KEY]: expect.any(String) }),
      }),
    );
  });

  it('includes unsaved soundboard memory in the full backup without changing its stored snapshot', () => {
    const current = {
      tracks: [
        {
          id: 'rain',
          name: 'Rain',
          videoId: 'jNQXAC9IVRw',
          category: 'custom',
          favorite: true,
        },
      ],
      categories: [{ id: 'custom', name: null }],
    };
    useSoundboardStore.setState(current);
    const previous = localStorage.getItem('fumble-soundboard');
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(saveSoundboard(current)).toBe(false);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    const exported = mocks.serializeBackup.mock.calls.at(-1)![0] as FumbleBackup;
    expect(JSON.parse(exported.data['fumble-soundboard']!).state).toEqual(current);
    expect(localStorage.getItem('fumble-soundboard')).toBe(previous);
    expect(emptyBackup.data).toEqual({});
    failure.mockRestore();
  });

  it('does not replace unreadable original soundboard contents with defaults during export', async () => {
    localStorage.setItem('fumble-soundboard', '{broken');
    await soundboardStorage!.getItem('fumble-soundboard');
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(mocks.serializeBackup).toHaveBeenCalledWith(emptyBackup);
    expect(localStorage.getItem('fumble-soundboard')).toBe('{broken');
  });

  it('previews metadata and contents without restoring, then lets the user save current data or cancel', async () => {
    mocks.createBackup.mockReturnValue(backup);
    renderPage();
    expect(screen.queryByText('data.currentEmpty')).not.toBeInTheDocument();
    await selectBackup();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'data.previewTitle' })).toHaveFocus(),
    );
    expect(screen.getByText('backup.json')).toBeVisible();
    expect(screen.getByText(/Aug 3, 2026/)).toBeVisible();
    expect(mocks.confirmDialog).not.toHaveBeenCalled();
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'data.safetyAction' }));
    expect(mocks.serializeBackup).toHaveBeenCalledWith(backup);
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(
      screen.queryByRole('heading', { name: 'data.previewTitle' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'data.chooseFile' })).toHaveFocus();
  });

  it('requires final confirmation and leaves existing data alone when canceled', async () => {
    mocks.confirmDialog.mockResolvedValue(false);
    renderPage();
    await selectBackup();
    restore();
    await waitFor(() =>
      expect(mocks.confirmDialog).toHaveBeenCalledWith('data.importConfirm', {
        title: 'data.confirmTitle',
        confirmLabel: 'data.importAction',
        tone: 'danger',
        initialFocus: 'cancel',
      }),
    );
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'data.importAction' })).toBeEnabled(),
    );
  });

  it('restores an accepted backup and reloads the stores', async () => {
    const navigationError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    renderPage();
    await selectBackup();
    restore();
    await waitFor(() =>
      expect(mocks.restoreBackup).toHaveBeenCalledWith(localStorage, backup),
    );
    navigationError.mockRestore();
  });

  it('requires acknowledgement and a specific confirmation for empty backups', async () => {
    mocks.parseBackup.mockReturnValue(emptyBackup);
    mocks.confirmDialog.mockResolvedValue(false);
    renderPage();
    await selectBackup();
    expect(screen.getByText('data.emptyWarning')).toBeVisible();
    expect(screen.getByRole('button', { name: 'data.importAction' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'data.emptyAccept' }));
    restore();
    await waitFor(() =>
      expect(mocks.confirmDialog).toHaveBeenCalledWith(
        'data.emptyConfirm',
        expect.anything(),
      ),
    );
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
    await selectBackup();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  for (const [error, key] of [
    [new SyntaxError(), 'invalid'],
    [new Error('backup-invalid'), 'invalid'],
    [new Error('backup-invalid-data'), 'invalidData'],
    [new Error('backup-version'), 'unsupportedVersion'],
    [new Error('backup-too-large'), 'tooLarge'],
    [new Error('backup-too-many-keys'), 'tooManyKeys'],
    [new Error('unavailable'), 'readError'],
    ['failure', 'readError'],
  ] as const) {
    it(`explains ${key} import errors without confirmation or writes`, async () => {
      mocks.parseBackup.mockImplementation(() => {
        throw error;
      });
      renderPage();
      fireEvent.change(screen.getByLabelText('data.chooseFile'), {
        target: { files: [makeFile()] },
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(`data.${key}`);
      expect(mocks.confirmDialog).not.toHaveBeenCalled();
      expect(mocks.restoreBackup).not.toHaveBeenCalled();
      expect(screen.getByLabelText('data.chooseFile')).toHaveValue('');
    });
  }

  it('rejects oversized files before reading them', async () => {
    renderPage();
    const file = makeFile();
    const read = vi.fn();
    Object.defineProperty(file, 'size', { value: MAX_BACKUP_BYTES + 1 });
    const large = new File([], 'large.json');
    Object.defineProperty(large, 'size', { value: MAX_BACKUP_BYTES + 1 });
    Object.defineProperty(large, 'text', { value: read });
    fireEvent.change(screen.getByLabelText('data.chooseFile'), {
      target: { files: [large] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('data.tooLarge');
    expect(read).not.toHaveBeenCalled();
  });

  it('reports file read failures and allows another selection', async () => {
    renderPage();
    const file = new File([], 'unavailable.json');
    Object.defineProperty(file, 'text', {
      value: () => Promise.reject(new Error('unavailable')),
    });
    fireEvent.change(screen.getByLabelText('data.chooseFile'), {
      target: { files: [file] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('data.readError');
    await selectBackup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports current data read errors without blocking recovery downloads', () => {
    mocks.createBackup.mockImplementationOnce(() => {
      throw new Error('unavailable');
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('data.currentError');
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(screen.getByText('data.exported')).toBeVisible();
  });

  for (const [error, key] of [
    [new Error('backup-too-large'), 'tooLarge'],
    [new Error('unavailable'), 'exportError'],
    [new Error('backup-too-many-keys'), 'tooManyKeys'],
    ['failure', 'exportError'],
  ] as const) {
    it(`reports ${key} export errors`, () => {
      mocks.serializeBackup.mockImplementation(() => {
        throw error;
      });
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
      expect(screen.getByRole('alert')).toHaveTextContent(`data.${key}`);
    });
  }

  it('cleans download resources if the browser fails to start the download', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(screen.getByRole('alert')).toHaveTextContent('data.exportError');
    expect(mocks.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('reports restore storage errors and keeps the preview available', async () => {
    mocks.restoreBackup.mockImplementation(() => {
      throw new Error('quota');
    });
    renderPage();
    await selectBackup();
    restore();
    expect(await screen.findByRole('alert')).toHaveTextContent('data.storageError');
    expect(screen.getByRole('button', { name: 'data.importAction' })).toBeEnabled();
  });

  it('disables actions while reading a file and ignores a read after unmount', async () => {
    let resolveText!: (text: string) => void;
    const file = new File([], 'slow.json');
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve;
        }),
    });
    const view = renderPage();
    fireEvent.change(screen.getByLabelText('data.chooseFile'), {
      target: { files: [file] },
    });
    expect(screen.getByText('data.processing')).toBeVisible();
    expect(screen.getByRole('button', { name: 'data.chooseFile' })).toBeDisabled();
    view.unmount();
    await act(async () => {
      resolveText('valid');
    });
    expect(mocks.parseBackup).not.toHaveBeenCalled();
  });

  it('ignores a failed file read after unmount', async () => {
    let rejectText!: (error: Error) => void;
    const file = new File([], 'slow.json');
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((_, reject) => {
          rejectText = reject;
        }),
    });
    const view = renderPage();
    fireEvent.change(screen.getByLabelText('data.chooseFile'), {
      target: { files: [file] },
    });
    view.unmount();
    await act(async () => {
      rejectText(new Error('unavailable'));
    });
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
  });

  it('does not restore if the page closes during confirmation', async () => {
    let confirm!: (accepted: boolean) => void;
    mocks.confirmDialog.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          confirm = resolve;
        }),
    );
    const view = renderPage();
    await selectBackup();
    restore();
    view.unmount();
    await act(async () => {
      confirm(true);
    });
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
  });

  it('keeps unreadable Homebrew available through its own recovery actions', () => {
    const raw = '{broken';
    localStorage.setItem(HOMEBREW_KEY, raw);
    mocks.createBackup.mockReturnValue({
      ...backup,
      data: { ...backup.data, [HOMEBREW_KEY]: raw },
    });
    try {
      renderPage();
      expect(screen.getByText('homebrew.backupRecovery')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
      expect(mocks.serializeBackup).toHaveBeenLastCalledWith(backup);
      expect(localStorage.getItem(HOMEBREW_KEY)).toBe(raw);
    } finally {
      localStorage.removeItem(HOMEBREW_KEY);
      useHomebrewStore.getState().loadStored();
    }
  });

  it('aborts a full restore if Homebrew changes during confirmation', async () => {
    let accept: (value: boolean) => void = () => undefined;
    mocks.confirmDialog.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        accept = resolve;
      }),
    );
    renderPage();
    await selectBackup();
    restore();
    const newer = serializeHomebrew([]);
    localStorage.setItem(HOMEBREW_KEY, newer);
    try {
      await act(async () => accept(true));
      expect(screen.getByText('data.storageError')).toBeVisible();
      expect(mocks.restoreBackup).not.toHaveBeenCalled();
      expect(localStorage.getItem(HOMEBREW_KEY)).toBe(newer);
    } finally {
      localStorage.removeItem(HOMEBREW_KEY);
      useHomebrewStore.getState().loadStored();
    }
  });
});
