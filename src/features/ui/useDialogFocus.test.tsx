import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDialogFocus } from './useDialogFocus';

function Dialog({
  open,
  children,
  onClose,
}: {
  open: boolean;
  children?: ReactNode;
  onClose?: () => void;
}) {
  const ref = useDialogFocus<HTMLDivElement>(open, onClose);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      {children}
    </div>
  );
}

function MissingDialog({ open }: { open: boolean }) {
  useDialogFocus(open);
  return null;
}

describe('useDialogFocus', () => {
  it('keeps focus inside the active dialog and closes only the topmost dialog', () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();
    const outside = document.createElement('button');
    document.body.append(outside);
    render(
      <>
        <Dialog open onClose={parentClose}>
          <button type="button">Parent</button>
        </Dialog>
        <Dialog open onClose={childClose}>
          <button type="button">Child</button>
        </Dialog>
      </>,
    );
    outside.focus();
    expect(screen.getByRole('button', { name: 'Child' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Child' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(childClose).toHaveBeenCalledOnce();
    expect(parentClose).not.toHaveBeenCalled();
    outside.remove();
  });

  it('returns outside focus to an empty dialog', () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    render(<Dialog open />);
    outside.focus();
    expect(screen.getByTestId('dialog')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    outside.remove();
  });
  it('does nothing while closed and restores the previous focus', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const view = render(
      <Dialog open={false}>
        <button type="button">First</button>
      </Dialog>,
    );

    expect(document.activeElement).toBe(trigger);
    view.rerender(
      <Dialog open>
        <button type="button">First</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
    view.rerender(
      <Dialog open={false}>
        <button type="button">First</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('handles a missing or empty dialog ref', () => {
    render(<MissingDialog open />);
    render(<Dialog open />);
    const dialog = screen.getByTestId('dialog');

    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog);
  });

  it('wraps focus at both ends and leaves middle focus unchanged', () => {
    render(
      <Dialog open>
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </Dialog>,
    );
    const first = screen.getByRole('button', { name: 'First' });
    const middle = screen.getByRole('button', { name: 'Middle' });
    const last = screen.getByRole('button', { name: 'Last' });

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    middle.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(middle);
  });
});
