import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundboardPage } from './SoundboardPage';

const mocks = vi.hoisted(() => ({
  state: {
    tracks: [
      {
        id: 'one',
        name: 'Forest',
        videoId: 'video-one',
        category: 'ambience',
      },
      {
        id: 'two',
        name: 'Battle',
        videoId: 'video-two',
        playlistId: 'playlist',
        category: 'combat',
      },
    ],
    categories: [
      { id: 'ambience', name: null as string | null },
      { id: 'combat', name: null as string | null },
      { id: 'custom', name: null as string | null },
    ],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    moveTrack: vi.fn(),
    setTrackCategory: vi.fn(),
    addCategory: vi.fn(),
    renameCategory: vi.fn(),
    removeCategory: vi.fn(),
    resetEmpty: vi.fn(),
    resetToExamples: vi.fn(),
  },
  confirm: vi.fn(),
  locale: 'en' as 'en' | 'pl',
  dragging: false,
}));

vi.mock('./store', () => ({
  useSoundboardStore: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

vi.mock('./youtube', () => ({
  parseYouTubeId: (url: string) => (url.includes('valid') ? 'parsed-id' : null),
  thumbnailUrl: (id: string) => `/thumb/${id}`,
  embedUrl: (id: string, playlist?: string) => `/embed/${id}/${playlist ?? ''}`,
}));

vi.mock('@/features/ui/confirmStore', () => ({
  confirmDialog: (...args: unknown[]) => mocks.confirm(...args),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key, locale: mocks.locale }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => {
  const invoke = (callback: unknown, event: unknown) => {
    if (typeof callback === 'function') Reflect.apply(callback, undefined, [event]);
  };
  return {
    DndContext: ({
      children,
      onDragStart,
      onDragEnd,
      onDragCancel,
    }: {
      children: ReactNode;
      onDragStart?: unknown;
      onDragEnd?: unknown;
      onDragCancel?: unknown;
    }) => (
      <div>
        {children}
        <button
          type="button"
          data-testid="drag-start"
          onClick={() => invoke(onDragStart, { active: { id: 'one' } })}
        />
        <button
          type="button"
          data-testid="drag-no-over"
          onClick={() => invoke(onDragEnd, { active: { id: 'one' }, over: null })}
        />
        <button
          type="button"
          data-testid="drag-same"
          onClick={() =>
            invoke(onDragEnd, { active: { id: 'one' }, over: { id: 'one' } })
          }
        />
        <button
          type="button"
          data-testid="drag-move"
          onClick={() =>
            invoke(onDragEnd, { active: { id: 'one' }, over: { id: 'two' } })
          }
        />
        <button
          type="button"
          data-testid="drag-missing"
          onClick={() =>
            invoke(onDragEnd, { active: { id: 'one' }, over: { id: 'missing' } })
          }
        />
        <button
          type="button"
          data-testid="drag-cancel"
          onClick={() => invoke(onDragCancel, undefined)}
        />
      </div>
    ),
    DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    closestCenter: vi.fn(),
    PointerSensor: function PointerSensor() {},
    TouchSensor: function TouchSensor() {},
    useSensor: vi.fn((sensor: unknown) => sensor),
    useSensors: vi.fn((...sensors: unknown[]) => sensors),
  };
});

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  rectSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: mocks.dragging,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => undefined) } },
}));

describe('SoundboardPage', () => {
  const renderPage = (path = '/dm/soundboard') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <SoundboardPage />
      </MemoryRouter>,
    );

  beforeEach(() => {
    mocks.locale = 'en';
    mocks.dragging = false;
    mocks.state.tracks = [
      {
        id: 'one',
        name: 'Forest',
        videoId: 'video-one',
        category: 'ambience',
      },
      {
        id: 'two',
        name: 'Battle',
        videoId: 'video-two',
        playlistId: 'playlist',
        category: 'combat',
      },
    ];
    mocks.state.categories = [
      { id: 'ambience', name: null },
      { id: 'combat', name: null },
      { id: 'custom', name: null },
    ];
    mocks.state.addTrack.mockReset();
    mocks.state.removeTrack.mockReset();
    mocks.state.moveTrack.mockReset();
    mocks.state.setTrackCategory.mockReset();
    mocks.state.addCategory.mockReset();
    mocks.state.renameCategory.mockReset();
    mocks.state.removeCategory.mockReset();
    mocks.state.resetEmpty.mockReset();
    mocks.state.resetToExamples.mockReset();
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
  });

  it('validates and adds tracks with custom and fallback names', () => {
    renderPage();
    const name = screen.getByPlaceholderText('soundboard.namePlaceholder');
    const url = screen.getByPlaceholderText(/youtube\.com/);

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.add' }));
    expect(screen.getByText('soundboard.invalidLink')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: '  Tavern  ' } });
    fireEvent.change(url, { target: { value: 'valid link' } });
    fireEvent.keyDown(url, { key: 'Enter' });
    expect(mocks.state.addTrack).toHaveBeenCalledWith('Tavern', 'parsed-id', 'custom');
    expect(screen.queryByText('soundboard.invalidLink')).not.toBeInTheDocument();

    fireEvent.change(url, { target: { value: 'valid again' } });
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.add' }));
    expect(mocks.state.addTrack).toHaveBeenCalledWith(
      'soundboard.untitledTrack',
      'parsed-id',
      'custom',
    );
    fireEvent.keyDown(url, { key: 'Escape' });
  });

  it('plays, stops, filters, removes and edits tracks', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Forest/ }));
    expect(screen.getByTitle('Forest')).toHaveAttribute('src', '/embed/video-one/');
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.stop' }));
    expect(screen.queryByTitle('Forest')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.category.combat' }));
    expect(screen.getByText('Battle')).toBeInTheDocument();
    expect(screen.queryByText('Forest')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Battle/ }));
    expect(screen.getByTitle('Battle')).toHaveAttribute(
      'src',
      '/embed/video-two/playlist',
    );
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.removeTrack' }));
    expect(mocks.state.removeTrack).toHaveBeenCalledWith('two');
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'soundboard.changeTrackCategory',
      }),
      { target: { value: 'ambience' } },
    );
    expect(mocks.state.setTrackCategory).toHaveBeenCalledWith('two', 'ambience');
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.done' }));
    expect(
      screen.queryByRole('combobox', {
        name: 'soundboard.changeTrackCategory',
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.editTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.removeTrack' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.category.all' }));
  });

  it('restores the category filter from the URL', () => {
    renderPage('/dm/soundboard?category=combat');
    expect(
      screen.getByRole('button', { name: 'soundboard.category.combat' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Battle')).toBeInTheDocument();
    expect(screen.queryByText('Forest')).not.toBeInTheDocument();
  });

  it('manages categories and confirms both reset actions', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.manageCategories' }));
    const categoryName = screen.getByRole('textbox', {
      name: 'soundboard.newCategory',
    });
    fireEvent.keyDown(categoryName, { key: 'Enter' });
    fireEvent.change(categoryName, { target: { value: '  Entered  ' } });
    fireEvent.keyDown(categoryName, { key: 'Enter' });
    expect(mocks.state.addCategory).toHaveBeenCalledWith('Entered');
    fireEvent.change(categoryName, { target: { value: 'Boss fights' } });
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.addCategory' }));
    expect(mocks.state.addCategory).toHaveBeenCalledWith('Boss fights');

    fireEvent.change(
      screen.getAllByRole('textbox', { name: 'soundboard.renameCategory' })[0]!,
      { target: { value: 'Nature' } },
    );
    expect(mocks.state.renameCategory).toHaveBeenCalledWith('ambience', 'Nature');
    fireEvent.click(
      screen.getAllByRole('button', { name: 'soundboard.removeCategory' })[0]!,
    );
    expect(mocks.state.removeCategory).toHaveBeenCalledWith('ambience');

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.clear' }));
    await waitFor(() => expect(mocks.state.resetEmpty).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.restoreExamples' }));
    await waitFor(() => expect(mocks.state.resetToExamples).toHaveBeenCalled());

    mocks.confirm.mockResolvedValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.restoreExamples' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(4));
    expect(mocks.state.resetEmpty).toHaveBeenCalledTimes(1);
  });

  it('handles drag callbacks and localized track names', () => {
    mocks.locale = 'pl';
    mocks.dragging = true;
    mocks.state.tracks = [
      {
        id: 'one',
        name: 'Forest',
        videoId: 'video-one',
        category: 'ambience',
      },
      {
        id: 'bardify-ewceCUF4qtU',
        name: 'English name',
        videoId: 'video-one',
        category: 'ambience',
      },
      {
        id: 'two',
        name: 'Battle',
        videoId: 'video-two',
        category: 'combat',
      },
    ];
    renderPage();
    expect(screen.getByText(/D&D/)).toBeVisible();

    fireEvent.click(screen.getByTestId('drag-start'));
    fireEvent.click(screen.getByTestId('drag-no-over'));
    fireEvent.click(screen.getByTestId('drag-same'));
    fireEvent.click(screen.getByTestId('drag-move'));
    fireEvent.click(screen.getByTestId('drag-missing'));
    fireEvent.click(screen.getByTestId('drag-cancel'));

    expect(mocks.state.moveTrack).toHaveBeenCalledWith(0, 2);
  });

  it('uses default names, custom category labels and category reset behavior', () => {
    mocks.state.tracks = [
      {
        id: 'bardify-playlist-places',
        name: 'English playlist',
        videoId: 'video-one',
        category: 'ambience',
      },
    ];
    mocks.state.categories[0] = { id: 'ambience', name: 'Nature' };
    renderPage('/dm/soundboard?category=ambience');
    expect(screen.getByText('soundboard.defaultTrack.places')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'soundboard.categoryLabel' }), {
      target: { value: 'ambience' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.manageCategories' }));
    fireEvent.click(
      screen.getAllByRole('button', { name: 'soundboard.removeCategory' })[0]!,
    );
    expect(mocks.state.removeCategory).toHaveBeenCalledWith('ambience');
  });
});
