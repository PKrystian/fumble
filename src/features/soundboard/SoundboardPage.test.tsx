import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      { id: 'ambience', name: null },
      { id: 'combat', name: null },
      { id: 'custom', name: null },
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
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('SoundboardPage', () => {
  const renderPage = (path = '/dm/soundboard') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <SoundboardPage />
      </MemoryRouter>,
    );

  beforeEach(() => {
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
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(3));
    expect(mocks.state.resetEmpty).toHaveBeenCalledTimes(1);
  });
});
