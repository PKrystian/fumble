import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
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
  });
});
