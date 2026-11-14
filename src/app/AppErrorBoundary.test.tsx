import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reload: vi.fn(), backup: vi.fn() }));
vi.mock('./reload', () => ({ reloadPage: mocks.reload }));
vi.mock('@/features/data/emergencyBackup', () => ({
  downloadStoredBackup: mocks.backup,
}));

import { AppErrorBoundary } from './AppErrorBoundary';

function Broken(): ReactNode {
  throw new Error('broken');
}

const renderBoundary = (children: ReactNode) =>
  render(
    <AppErrorBoundary
      title="Failed"
      message="Try again"
      reloadLabel="Reload"
      backupLabel="Download backup"
      backupDoneMessage="Backup downloaded"
      backupFailedMessage="Backup failed"
    >
      {children}
    </AppErrorBoundary>,
  );

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    mocks.reload.mockReset();
    mocks.backup.mockReset();
  });

  it('renders children while nothing fails', () => {
    renderBoundary(<p>Working</p>);
    expect(screen.getByText('Working')).toBeInTheDocument();
  });

  it('offers a reload and a backup after a child failure', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderBoundary(<Broken />);
    consoleError.mockRestore();

    expect(screen.getByRole('alert')).toHaveTextContent('Try again');
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(mocks.reload).toHaveBeenCalledTimes(1);

    mocks.backup.mockReturnValueOnce(true).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));
    expect(screen.getByText('Backup downloaded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download backup' }));
    expect(screen.getByText('Backup failed')).toBeInTheDocument();
  });
});
