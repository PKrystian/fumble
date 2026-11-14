import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackForm } from './TrackForm';
import { TrackCard } from './TrackCard';
import { CategoryManager } from './CategoryManager';
import { downloadSoundboard, downloadSoundboardFile } from './files';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: true,
  }),
}));
const track = { id: 'rain', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'custom' };
const categories = [
  { id: 'custom', name: null },
  { id: 'rain', name: 'Weather' },
];
beforeEach(() => vi.restoreAllMocks());
describe('soundboard forms', () => {
  it('preserves a playlist thumbnail on name edits and falls back when a category was removed', async () => {
    const save = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TrackForm
          track={{ ...track, playlistId: 'PL1234567890' }}
          displayName="Rain playlist"
          category="removed"
          categories={categories}
          onSave={save}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('combobox')).toHaveValue('custom');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledWith(
      'Rain playlist',
      { videoId: track.videoId, playlistId: 'PL1234567890' },
      'custom',
    );
  });
  it('accepts an untitled video, changes the category explicitly, and submits with Enter', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(
      <MemoryRouter>
        <TrackForm categories={categories} category="custom" onSave={save} />
      </MemoryRouter>,
    );
    await user.type(screen.getByRole('textbox', { name: 'YouTube link' }), track.videoId);
    await user.selectOptions(screen.getByRole('combobox'), 'rain');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '{Enter}');
    expect(save).toHaveBeenCalledWith(
      'Untitled track',
      { videoId: track.videoId },
      'rain',
    );
  });
  it('saves a category rename only after validation and supports cancelling', async () => {
    const user = userEvent.setup();
    const rename = vi.fn();
    render(
      <MemoryRouter>
        <CategoryManager
          categories={categories}
          tracks={[track]}
          onAdd={vi.fn()}
          onRename={rename}
          onRemove={vi.fn()}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Rename Weather' }));
    expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveFocus();
    await user.clear(screen.getByRole('textbox', { name: 'Category name' }));
    await user.type(screen.getByRole('textbox', { name: 'Category name' }), 'My tracks');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('already exists');
    await user.clear(screen.getByRole('textbox', { name: 'Category name' }));
    await user.type(screen.getByRole('textbox', { name: 'Category name' }), 'Storms');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(rename).toHaveBeenCalledWith('rain', 'Storms');
  });
  it('keeps actions available when artwork fails and offers both move directions', () => {
    const move = vi.fn();
    render(
      <MemoryRouter>
        <ul>
          <TrackCard
            track={track}
            name="Rain"
            category="Weather"
            selected
            manual
            first={false}
            last={false}
            onPlay={vi.fn()}
            onEdit={vi.fn()}
            onRemove={vi.fn()}
            onFavorite={vi.fn()}
            onMove={move}
          />
        </ul>
      </MemoryRouter>,
    );
    fireEvent.error(document.querySelector('img')!);
    expect(document.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Move earlier: Rain' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move later: Rain' }));
    expect(move.mock.calls).toEqual([[-1], [1]]);
    expect(screen.getByRole('button', { name: 'Rain' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
describe('backup downloads', () => {
  it('downloads the current soundboard with favorites and releases its object URL', () => {
    const create = vi.fn(() => 'blob:backup');
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    downloadSoundboard({ tracks: [{ ...track, favorite: true }], categories });
    expect(click).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(revoke).toHaveBeenCalledWith('blob:backup');
    expect(document.querySelector('a[download]')).toBeNull();
    click.mockImplementation(() => {
      throw new Error('download');
    });
    expect(() => downloadSoundboardFile('{}', 'backup.json')).toThrow('download');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).toHaveBeenCalledTimes(2);
  });
});
