import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const { useSortable, sortableContext } = vi.hoisted(() => ({
  useSortable: vi.fn(),
  sortableContext: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    items: string[];
    strategy: unknown;
  }) => {
    sortableContext(props);
    return <section>{children}</section>;
  },
  useSortable,
  verticalListSortingStrategy: 'vertical',
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (value: unknown) => (value ? 'translate3d(1px, 2px, 0)' : undefined),
    },
  },
}));

import { SortablePanel, SortableZone } from './SortablePanel';

describe('sortable character panels', () => {
  it('binds the drag handle and renders a normal panel', () => {
    const setNodeRef = vi.fn();
    useSortable.mockReturnValue({
      attributes: { 'data-attribute': 'bound' },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef,
      transform: { x: 1, y: 2 },
      transition: 'transform 1s',
      isDragging: false,
    });

    const { container } = render(
      <MemoryRouter>
        <SortablePanel id="notes">
          <p>Notes</p>
        </SortablePanel>
      </MemoryRouter>,
    );

    expect(useSortable).toHaveBeenCalledWith({ id: 'notes' });
    expect(setNodeRef).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Drag to reorder' })).toHaveAttribute(
      'data-attribute',
      'bound',
    );
    expect(container.firstChild).toHaveStyle({
      transform: 'translate3d(1px, 2px, 0)',
      transition: 'transform 1s',
    });
    expect(container.firstChild).not.toHaveClass('opacity-50');
  });

  it('marks a dragged panel and renders a sortable zone', () => {
    useSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    });

    const { container } = render(
      <MemoryRouter>
        <SortableZone panelIds={['stats']}>
          <SortablePanel id="stats">Stats</SortablePanel>
        </SortableZone>
      </MemoryRouter>,
    );

    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
    expect(sortableContext).toHaveBeenCalledWith({
      items: ['stats'],
      strategy: 'vertical',
    });
  });
});
