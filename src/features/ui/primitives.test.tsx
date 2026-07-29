import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, SearchField, ToggleChip } from './primitives';

describe('UI primitives', () => {
  it('uses button semantics by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('clears a populated search field', () => {
    const onClear = vi.fn();
    render(
      <SearchField label="Clear search" value="dragon" onClear={onClear} readOnly />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('exposes filter state', () => {
    render(<ToggleChip active>Spells</ToggleChip>);
    expect(screen.getByRole('button', { name: 'Spells' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
