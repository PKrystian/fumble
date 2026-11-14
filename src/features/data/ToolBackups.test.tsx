import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_BACKUP_BYTES } from './backup';
import type { ToolBackup, ToolRestore } from './toolBackupAdapters';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  tools: [] as ToolBackup[],
}));
vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: mocks.confirm }));
vi.mock('./toolBackupAdapters', () => ({
  get TOOL_BACKUPS() {
    return mocks.tools;
  },
}));

import { ToolBackups } from './ToolBackups';

const onChange = vi.fn();
const apply = vi.fn();
const download = vi.fn();
const parse = vi.fn();
const restore = (overrides: Partial<ToolRestore> = {}): ToolRestore => ({
  exportedAt: '2026-08-03T12:00:00.000Z',
  version: 1,
  details: [{ label: 'Rewards', value: 2 }],
  empty: false,
  apply,
  ...overrides,
});
const tool = (overrides: Partial<ToolBackup> = {}): ToolBackup => ({
  id: 'loot',
  labelKey: 'nav.lootGenerator',
  to: '/dm/loot',
  countKey: 'data.counts.loot',
  scopeKey: 'dm.loot.importScope',
  emptyKey: 'dm.loot.emptyImport',
  count: () => 3,
  available: () => true,
  download,
  parse,
  ...overrides,
});
function file(text = '{}', name = 'loot.json') {
  const value = new File([text], name, { type: 'application/json' });
  Object.defineProperty(value, 'text', {
    configurable: true,
    value: () => Promise.resolve(text),
  });
  return value;
}
const renderTools = () =>
  render(
    <MemoryRouter>
      <ToolBackups onChange={onChange} />
    </MemoryRouter>,
  );
const button = (name: string) => screen.getByRole('button', { name });
const input = () => screen.getByLabelText('Restore from file', { selector: 'input' });
async function choose(value = file()) {
  fireEvent.click(button('Loot Generator: restore from a file'));
  fireEvent.change(input(), { target: { files: [value] } });
  return screen.findByRole('group', { name: 'Check the backup: Loot Generator' });
}

beforeEach(() => {
  mocks.tools = [tool()];
  mocks.confirm.mockReset().mockResolvedValue(true);
  onChange.mockReset();
  apply.mockReset().mockReturnValue(true);
  download.mockReset();
  parse.mockReset().mockImplementation(() => restore());
});

describe('tool backups', () => {
  it('lists tools with counts and reports downloads', () => {
    mocks.tools = [
      tool(),
      tool({ id: 'broken', labelKey: 'nav.soundboard', available: () => false }),
    ];
    renderTools();
    expect(screen.getByRole('link', { name: 'Loot Generator' })).toHaveAttribute(
      'href',
      '/dm/loot/',
    );
    expect(screen.getByText('Loot rewards: 3')).toBeVisible();
    expect(screen.getByText(/needs attention/)).toBeVisible();
    expect(button('Soundboard: download a backup')).toBeDisabled();
    expect(button('Soundboard: restore from a file')).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Characters' })).toHaveAttribute(
      'href',
      '/character/',
    );

    fireEvent.click(button('Loot Generator: download a backup'));
    expect(screen.getByText('Backup download started: Loot Generator.')).toBeVisible();
    download.mockImplementation(() => {
      throw new Error('denied');
    });
    fireEvent.click(button('Loot Generator: download a backup'));
    expect(screen.getByRole('alert')).toHaveTextContent('could not be downloaded');
  });

  it('previews a file without writing, then restores after confirmation', async () => {
    renderTools();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.change(input(), { target: { files: [file()] } });
    expect(parse).not.toHaveBeenCalled();
    fireEvent.click(button('Loot Generator: restore from a file'));
    expect(click).toHaveBeenCalledOnce();
    fireEvent.change(input(), { target: { files: [] } });
    const preview = await choose(file('{"a":1}', 'saved.json'));
    expect(
      within(preview).getByRole('heading', { name: 'Check the backup: Loot Generator' }),
    ).toHaveFocus();
    expect(within(preview).getByText('saved.json')).toBeVisible();
    expect(within(preview).getByText('Rewards')).toBeVisible();
    expect(preview.querySelector('.notice-warning')).not.toBeEmptyDOMElement();
    expect(apply).not.toHaveBeenCalled();

    fireEvent.click(button('Download current data first: Loot Generator'));
    expect(download).toHaveBeenCalledOnce();

    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(button('Replace and restore'));
    await waitFor(() => expect(button('Replace and restore')).toBeEnabled());
    expect(apply).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.stringContaining('saved.json'),
      expect.objectContaining({ tone: 'danger', initialFocus: 'cancel' }),
    );

    fireEvent.click(button('Replace and restore'));
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(screen.getByText('Restored: Loot Generator.')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('keeps the preview when the restore fails or throws', async () => {
    renderTools();
    await choose();
    apply.mockReturnValueOnce(false);
    fireEvent.click(button('Replace and restore'));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be restored');
    expect(screen.getByRole('group')).toBeInTheDocument();
    apply.mockRejectedValueOnce(new Error('write'));
    fireEvent.click(button('Replace and restore'));
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be restored');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('requires an acknowledgement for an empty backup and supports cancel', async () => {
    parse.mockImplementation(() =>
      restore({ empty: true, exportedAt: null, version: null }),
    );
    renderTools();
    const preview = await choose();
    expect(within(preview).queryByText('Created')).not.toBeInTheDocument();
    expect(button('Replace and restore')).toBeDisabled();
    fireEvent.click(within(preview).getByRole('checkbox'));
    expect(button('Replace and restore')).toBeEnabled();
    fireEvent.click(button('Cancel'));
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('rejects invalid and oversized files without changing data', async () => {
    renderTools();
    parse.mockImplementation(() => {
      throw new Error('invalid');
    });
    fireEvent.click(button('Loot Generator: restore from a file'));
    fireEvent.change(input(), { target: { files: [file('bad')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('not a valid backup');
    const oversized = file('x');
    Object.defineProperty(oversized, 'size', { value: MAX_BACKUP_BYTES + 1 });
    parse.mockClear();
    fireEvent.change(input(), { target: { files: [oversized] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(parse).not.toHaveBeenCalled();
  });

  it('ignores late reads and confirmations after leaving the page', async () => {
    let resolveRead!: (text: string) => void;
    const slow = file();
    Object.defineProperty(slow, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        }),
    });
    const first = renderTools();
    fireEvent.click(button('Loot Generator: restore from a file'));
    fireEvent.change(input(), { target: { files: [slow] } });
    first.unmount();
    await act(async () => resolveRead('{}'));
    expect(parse).not.toHaveBeenCalled();

    let rejectRead!: (error: Error) => void;
    const failing = file();
    Object.defineProperty(failing, 'text', {
      value: () =>
        new Promise<string>((_resolve, reject) => {
          rejectRead = reject;
        }),
    });
    const second = renderTools();
    fireEvent.click(button('Loot Generator: restore from a file'));
    fireEvent.change(input(), { target: { files: [failing] } });
    second.unmount();
    await act(async () => rejectRead(new Error('read')));

    let resolveConfirm!: (accepted: boolean) => void;
    mocks.confirm.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const third = renderTools();
    await choose();
    fireEvent.click(button('Replace and restore'));
    third.unmount();
    await act(async () => resolveConfirm(true));
    expect(apply).not.toHaveBeenCalled();

    let resolveApply!: (restored: boolean) => void;
    mocks.confirm.mockReset().mockResolvedValue(true);
    apply.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveApply = resolve;
        }),
    );
    const fourth = renderTools();
    await choose();
    fireEvent.click(button('Replace and restore'));
    await waitFor(() => expect(apply).toHaveBeenCalledOnce());
    fourth.unmount();
    await act(async () => resolveApply(true));
    expect(onChange).not.toHaveBeenCalled();
  });
});
