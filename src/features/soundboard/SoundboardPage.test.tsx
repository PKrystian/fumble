import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    moveTrack: vi.fn(),
    resetToDefaults: vi.fn(),
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
  beforeEach(() => {
    mocks.state.addTrack.mockReset();
    mocks.state.removeTrack.mockReset();
    mocks.state.moveTrack.mockReset();
    mocks.state.resetToDefaults.mockReset();
    mocks.confirm.mockReset();
    mocks.confirm.mockResolvedValue(true);
  });

  it('validates and adds tracks with custom and fallback names', () => {
    render(<SoundboardPage />);
    const name = screen.getByPlaceholderText('soundboard.namePlaceholder');
    const url = screen.getByPlaceholderText(/youtube\.com/);

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.add' }));
    expect(screen.getByText('soundboard.invalidLink')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: '  Tavern  ' } });
    fireEvent.change(url, { target: { value: 'valid link' } });
    fireEvent.keyDown(url, { key: 'Enter' });
    expect(mocks.state.addTrack).toHaveBeenCalledWith('Tavern', 'parsed-id');
    expect(screen.queryByText('soundboard.invalidLink')).not.toBeInTheDocument();

    fireEvent.change(url, { target: { value: 'valid again' } });
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.add' }));
    expect(mocks.state.addTrack).toHaveBeenCalledWith(
      'soundboard.untitledTrack',
      'parsed-id',
    );
    fireEvent.keyDown(url, { key: 'Escape' });
  });

  it('plays, stops, filters, removes and reorders tracks', () => {
    render(<SoundboardPage />);
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

    fireEvent.click(screen.getByRole('button', { name: 'soundboard.category.all' }));
    const items = screen.getAllByRole('listitem');
    fireEvent.drop(items[1]!);
    expect(mocks.state.moveTrack).not.toHaveBeenCalled();
    fireEvent.dragStart(items[0]!);
    fireEvent.dragOver(items[1]!);
    fireEvent.drop(items[1]!);
    expect(mocks.state.moveTrack).toHaveBeenCalledWith(0, 1);
  });

  it('confirms reset and preserves tracks when rejected', async () => {
    render(<SoundboardPage />);
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.reset' }));
    await waitFor(() => expect(mocks.state.resetToDefaults).toHaveBeenCalled());

    mocks.confirm.mockResolvedValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'soundboard.reset' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.state.resetToDefaults).toHaveBeenCalledTimes(1);
  });
});
