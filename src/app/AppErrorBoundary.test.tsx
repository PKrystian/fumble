import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function Broken(): ReactNode {
  throw new Error('broken');
}

describe('AppErrorBoundary', () => {
  it('renders recovery controls after a child failure', () => {
    render(
      <AppErrorBoundary title="Failed" message="Try again" reloadLabel="Reload">
        <Broken />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Try again');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
    const navigationError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    navigationError.mockRestore();
  });
});
