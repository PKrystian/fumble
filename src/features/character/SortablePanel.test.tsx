import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Panel } from './fields';
import { useWideLayout } from './layoutMeta';
import { DEFAULT_MOBILE_ORDER, useLayoutStore } from './layoutStore';
import { SortablePanel, SortableZone } from './SortablePanel';

function mount(wide: boolean, onMoved = vi.fn()) {
  const ids = wide ? useLayoutStore.getState().zones.center : DEFAULT_MOBILE_ORDER;
  render(
    <MemoryRouter initialEntries={['/character/x']}>
      <DndContext>
        <SortableZone panelIds={ids}>
          {['hitPoints', 'tabs'].map((id) => (
            <SortablePanel key={id} id={id} wide={wide} onMoved={onMoved}>
              <Panel title={id === 'tabs' ? 'Details' : 'Hit Points'}>
                <p>{`${id} body`}</p>
              </Panel>
            </SortablePanel>
          ))}
        </SortableZone>
      </DndContext>
    </MemoryRouter>,
  );
  return onMoved;
}

describe('sortable sheet panels', () => {
  beforeEach(() => {
    localStorage.clear();
    useLayoutStore.getState().reset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves panels within and between columns from the layout menu', () => {
    const onMoved = mount(true);
    expect(document.querySelector('.drag-grip')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Arrange Hit Points' }));
    expect(screen.getByRole('menuitem', { name: 'Move up' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }));
    expect(useLayoutStore.getState().zones.center[0]).toBe('hitPoints');
    expect(onMoved).toHaveBeenLastCalledWith(
      'Hit Points moved to position 1 in the center column.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arrange Hit Points' }));
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrange Hit Points' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move to right column' }));
    expect(useLayoutStore.getState().zones.right.at(-1)).toBe('hitPoints');
    expect(onMoved).toHaveBeenLastCalledWith(
      'Hit Points moved to position 6 in the right column.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arrange Details' }));
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toBeDisabled();
    expect(
      screen.getByRole('menuitem', { name: 'Move to left column' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move to center column' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Details' })).toBeNull();
  });

  it('collapses panels and moves them in the narrow order', () => {
    const onMoved = mount(false);
    expect(document.querySelector('.drag-grip')).toBeNull();
    const details = screen.getByText('Details');
    expect(details.tagName).toBe('H2');
    const hp = screen.getByRole('button', { name: 'Hit Points' });
    expect(hp).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(hp);
    expect(screen.queryByText('hitPoints body')).toBeNull();
    expect(useLayoutStore.getState().collapsed).toContain('hitPoints');
    fireEvent.click(screen.getByRole('button', { name: 'Arrange Hit Points' }));
    expect(screen.queryByRole('menuitem', { name: /column/ })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move down' }));
    expect(useLayoutStore.getState().mobileOrder.slice(0, 2)).toEqual([
      'combat',
      'hitPoints',
    ]);
    expect(onMoved).toHaveBeenLastCalledWith('Hit Points moved to position 2.');
  });

  it('keeps a panel unknown to the layout menu safe', () => {
    render(
      <MemoryRouter>
        <DndContext>
          <SortablePanel id="mystery" wide onMoved={vi.fn()}>
            <Panel title="Mystery">
              <p>body</p>
            </Panel>
          </SortablePanel>
        </DndContext>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Arrange mystery' }));
    expect(screen.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Move down' })).toBeDisabled();
  });

  it('tracks the wide layout media query', () => {
    const listeners: Array<() => void> = [];
    let matches = true;
    const remove = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches;
        },
        addEventListener: (_event: string, listener: () => void) =>
          listeners.push(listener),
        removeEventListener: remove,
      })),
    );
    const { result, unmount } = renderHook(() => useWideLayout());
    expect(result.current).toBe(true);
    matches = false;
    act(() => listeners.forEach((listener) => listener()));
    expect(result.current).toBe(false);
    unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('assumes a wide layout without media queries', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useWideLayout()).result.current).toBe(true);
  });
});
