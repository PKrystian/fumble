import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './ActionMenu';

function setup() {
  const first = vi.fn();
  const third = vi.fn();
  render(
    <div>
      <ActionMenu
        label="Export"
        items={[
          { id: 'a', label: 'First', onSelect: first },
          { id: 'b', label: 'Second', disabled: true, onSelect: vi.fn() },
          { id: 'c', label: 'Third', danger: true, onSelect: third },
        ]}
      />
      <p>Outside</p>
    </div>,
  );
  return { first, third, button: screen.getByRole('button', { name: 'Export' }) };
}

describe('ActionMenu', () => {
  it('opens with focus on the first enabled item and navigates by keyboard', () => {
    const { button, third } = setup();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu', { name: 'Export' });
    expect(button).toHaveAttribute('aria-controls', menu.id);
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Third' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(screen.getByRole('menuitem', { name: 'Third' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(screen.getByRole('menuitem', { name: 'Third' })).toHaveAttribute(
      'data-danger',
      'true',
    );
    fireEvent.keyDown(menu, { key: 'x' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Third' }));
    expect(third).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes with Escape, Tab and outside clicks', () => {
    const { button, first } = setup();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'First' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(first).not.toHaveBeenCalled();
  });

  it('supports icon buttons, custom content and menus without enabled items', () => {
    render(
      <ActionMenu
        label="Arrange"
        iconOnly
        align="start"
        className="extra"
        items={[{ id: 'x', label: 'Nothing', disabled: true, onSelect: vi.fn() }]}
      >
        <span>icon</span>
      </ActionMenu>,
    );
    const button = screen.getByRole('button', { name: 'Arrange' });
    expect(button).toHaveAttribute('title', 'Arrange');
    fireEvent.click(button);
    const menu = screen.getByRole('menu');
    expect(menu).toHaveClass('left-0');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Nothing' })).toBeDisabled();
  });
});
