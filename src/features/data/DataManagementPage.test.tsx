import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataManagementPage } from './DataManagementPage';

const mocks = vi.hoisted(() => ({
  createBackup: vi.fn(() => ({
    app: 'fumble' as const,
    version: 1 as const,
    exportedAt: '2026-08-03T00:00:00.000Z',
    data: {},
  })),
  serializeBackup: vi.fn(() => '{"app":"fumble"}'),
  parseBackup: vi.fn(),
  restoreBackup: vi.fn(),
  backupFilename: vi.fn(() => 'fumble-backup-test.json'),
  confirmDialog: vi.fn(),
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
}));

vi.mock('./backup', () => ({
  createBackup: mocks.createBackup,
  serializeBackup: mocks.serializeBackup,
  parseBackup: mocks.parseBackup,
  restoreBackup: mocks.restoreBackup,
  backupFilename: mocks.backupFilename,
}));

vi.mock('@/features/ui/confirmStore', () => ({
  confirmDialog: mocks.confirmDialog,
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

const backup = {
  app: 'fumble' as const,
  version: 1 as const,
  exportedAt: '2026-08-03T00:00:00.000Z',
  data: { 'fumble-settings': '{"state":{}}' },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DataManagementPage />
    </MemoryRouter>,
  );
}

function makeFile(text: string) {
  const file = new File([text], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}

describe('data management page', () => {
  beforeEach(() => {
    mocks.createBackup.mockReset();
    mocks.createBackup.mockReturnValue({
      app: 'fumble',
      version: 1,
      exportedAt: '2026-08-03T00:00:00.000Z',
      data: {},
    });
    mocks.parseBackup.mockReset();
    mocks.parseBackup.mockReturnValue(backup);
    mocks.restoreBackup.mockReset();
    mocks.backupFilename.mockReset();
    mocks.backupFilename.mockReturnValue('fumble-backup-test.json');
    mocks.confirmDialog.mockReset();
    mocks.confirmDialog.mockResolvedValue(true);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: mocks.createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: mocks.revokeObjectURL,
    });
  });

  it('exports a backup and reports storage errors', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(mocks.createBackup).toHaveBeenCalledWith(localStorage);
    expect(mocks.backupFilename).toHaveBeenCalledOnce();
    expect(mocks.createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(screen.getByText('data.exported')).toBeVisible();

    const inputClick = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'data.importAction' }));
    expect(inputClick).toHaveBeenCalledOnce();
    inputClick.mockRestore();

    mocks.createBackup.mockImplementation(() => {
      throw new Error('storage');
    });
    fireEvent.click(screen.getByRole('button', { name: 'data.exportAction' }));
    expect(screen.getByRole('alert')).toHaveTextContent('data.storageError');
    click.mockRestore();
  });

  it('handles invalid, canceled and accepted imports', async () => {
    const view = renderPage();
    const input = view.container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [] } });

    mocks.parseBackup.mockImplementation(() => {
      throw new SyntaxError('invalid json');
    });
    fireEvent.change(input, {
      target: { files: [makeFile('bad')] },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('data.invalid'),
    );
    expect(input).toHaveValue('');

    mocks.parseBackup.mockReturnValue(backup);
    mocks.confirmDialog.mockResolvedValue(false);
    fireEvent.change(input, {
      target: { files: [makeFile('valid')] },
    });
    await waitFor(() => expect(mocks.confirmDialog).toHaveBeenCalledOnce());
    expect(mocks.restoreBackup).not.toHaveBeenCalled();

    mocks.confirmDialog.mockResolvedValue(true);
    const navigationError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    fireEvent.change(input, {
      target: { files: [makeFile('valid')] },
    });
    await waitFor(() =>
      expect(mocks.restoreBackup).toHaveBeenCalledWith(localStorage, backup),
    );
    navigationError.mockRestore();
  });

  it('reports non-validation import errors', async () => {
    renderPage();
    const input = document.querySelector('input[type="file"]')!;
    mocks.parseBackup.mockImplementation(() => {
      throw new Error('disk failure');
    });
    fireEvent.change(input, {
      target: { files: [makeFile('data')] },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('data.storageError'),
    );
  });

  it('finishes an import after the page has unmounted', async () => {
    let resolveText: ((value: string) => void) | undefined;
    const file = new File(['valid'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve;
        }),
    });
    mocks.confirmDialog.mockResolvedValue(false);
    const view = renderPage();
    const input = view.container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [file] } });
    view.unmount();
    resolveText?.('valid');
    await waitFor(() => expect(mocks.parseBackup).toHaveBeenCalledWith('valid'));
    expect(mocks.restoreBackup).not.toHaveBeenCalled();
  });
});
