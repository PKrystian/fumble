import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundboardPage } from './SoundboardPage';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { useSoundboardStore } from './store';
import { allowSoundboardReplacement } from './persistence';
import type { Track } from './validation';
import * as files from './files';
import plNames from '@/data/generated/pl/bardify.json';

vi.mock('./SoundboardPlayer', () => ({
  SoundboardPlayer: ({ name, onStop }: { name: string; onStop: () => void }) => (
    <section aria-label="Test player">
      <p>{name}</p>
      <button onClick={onStop}>Stop</button>
    </section>
  ),
}));
const tracks: Track[] = [
  { id: 'rain', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'ambience' },
  {
    id: 'battle',
    name: 'Battle',
    videoId: 'ewceCUF4qtU',
    category: 'combat',
    favorite: true,
    createdAt: 1,
  },
];
function renderPage(path = '/dm/soundboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SoundboardPage />
      <ConfirmDialog />
    </MemoryRouter>,
  );
}
function stored() {
  return useSoundboardStore.getState();
}
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  allowSoundboardReplacement();
  useSoundboardStore.setState({
    tracks: [...tracks],
    categories: [
      { id: 'ambience', name: null },
      { id: 'combat', name: null },
      { id: 'custom', name: null },
    ],
  });
});
describe('soundboard library', () => {
  it('searches, clears, filters favorites, sorts independently and handles no matches', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole('searchbox'), '  RAIN  ');
    expect(screen.getByRole('button', { name: 'Rain' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Battle' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Favorites (1)' }));
    expect(
      screen.getByText('No matching tracks. Change or clear the search.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('button', { name: 'Battle' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'name');
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('name');
    expect(
      screen.queryByRole('button', { name: 'Move later: Rain' }),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'manual');
    await user.click(screen.getByRole('button', { name: 'Move later: Rain' }));
    expect(stored().tracks.map((track) => track.id)).toEqual(['battle', 'rain']);
    await user.click(screen.getByRole('button', { name: 'Favorite: Rain' }));
    expect(stored().tracks.find((track) => track.id === 'rain')?.favorite).toBe(true);
  });
  it('adds playlists with feedback, validates URLs and edits without an immediate category change', async () => {
    const user = userEvent.setup();
    renderPage('/dm/soundboard?category=ambience');
    await user.click(screen.getByRole('button', { name: 'Add a track or playlist' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid YouTube link.');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Playlist');
    await user.type(
      screen.getByRole('textbox', { name: 'YouTube link' }),
      'https://www.youtube.com/playlist?list=PL1234567890',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(stored().tracks.at(-1)).toMatchObject({
      name: 'Playlist',
      category: 'ambience',
      playlistId: 'PL1234567890',
      videoId: '',
    });
    await user.click(screen.getByRole('button', { name: 'Show added item' }));
    await user.click(screen.getByRole('button', { name: 'Edit Rain' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByRole('textbox', { name: 'Name' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Forest rain');
    await user.selectOptions(within(dialog).getByRole('combobox'), 'combat');
    expect(stored().tracks[0]?.category).toBe('ambience');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(stored().tracks[0]).toMatchObject({
      name: 'Forest rain',
      category: 'combat',
      customName: true,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('confirms named deletion, stops playback, and supports undo until another edit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Rain' }));
    await user.click(screen.getByRole('button', { name: 'Remove Rain' }));
    const confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(stored().tracks).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Remove Rain' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(screen.queryByRole('region', { name: 'Test player' })).not.toBeInTheDocument();
    expect(stored().tracks).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stored().tracks).toHaveLength(2);
    if (!screen.getByText('Library cleanup').closest('details')?.open)
      await user.click(screen.getByText('Library cleanup'));
    await user.click(screen.getByRole('button', { name: 'Clear soundboard' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Clear soundboard',
      }),
    );
    expect(
      screen.getByText(
        'Your soundboard is empty. Add a track or restore the Bardify examples.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stored().tracks).toHaveLength(2);
  });
  it('validates categories, saves explicitly, preserves tracks on delete and restores them', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Manage categories' }));
    let dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a category name.');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'New category' }),
      'Ambience',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('already exists');
    await user.clear(within(dialog).getByRole('textbox', { name: 'New category' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: 'New category' }),
      'Boss',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add category' }));
    await user.click(within(dialog).getByRole('button', { name: 'Rename Boss' }));
    await user.clear(within(dialog).getByRole('textbox', { name: 'Category name' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a category name.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remove Ambience' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('tracks (1)');
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(stored().tracks[0]?.category).toBe('custom');
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Undo' }));
    expect(stored().tracks[0]?.category).toBe('ambience');
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Manage categories' })).toHaveFocus();
  });
  it('paginates larger collections and renders Polish labels and empty categories', async () => {
    const many = Array.from({ length: 61 }, (_, index) => ({
      ...tracks[0]!,
      id: String(index),
      name: `Rain ${index}`,
    }));
    useSoundboardStore.setState({ tracks: many });
    const user = userEvent.setup();
    renderPage('/pl/dm/soundboard');
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Następna' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
    await user.click(screen.getByRole('button', { name: 'Poprzednia' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    await user.click(screen.getByRole('button', { name: 'Walka (0)' }));
    expect(
      screen.getByText(
        'Brak utworów w tej kategorii. Dodaj utwór lub wybierz inną kategorię.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps a moved track visible when it crosses the pagination boundary', async () => {
    useSoundboardStore.setState({
      tracks: Array.from({ length: 61 }, (_, index) => ({
        ...tracks[0]!,
        id: String(index),
        name: `Rain ${index}`,
      })),
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Move later: Rain 49' }));
    expect(screen.getByRole('button', { name: 'Rain 49' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Library' })).toHaveFocus();
    expect(screen.getAllByRole('listitem')).toHaveLength(11);
    await user.click(screen.getByRole('button', { name: 'Move earlier: Rain 49' }));
    expect(screen.getByRole('button', { name: 'Rain 49' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(stored().tracks[49]?.name).toBe('Rain 49');
  });
  it('reports failed saves and retains current data while retrying', async () => {
    const user = userEvent.setup();
    renderPage();
    const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await user.click(screen.getByRole('button', { name: 'Favorite: Rain' }));
    expect(screen.getByText(/Changes are not saved/)).toBeInTheDocument();
    expect(stored().tracks[0]?.favorite).toBe(true);
    fail.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Retry saving' }));
    expect(screen.getByText('Library saved in this browser.')).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem('fumble-soundboard')!).state.tracks[0].favorite,
    ).toBe(true);
  });
  it('does not overwrite corrupted storage and restores examples only after confirmation', async () => {
    localStorage.setItem('fumble-soundboard', '{broken');
    await useSoundboardStore.persist.rehydrate();
    const user = userEvent.setup();
    renderPage();
    expect(
      screen.getByText(/original contents have not been overwritten/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(localStorage.getItem('fumble-soundboard')).toBe('{broken');
    await user.click(screen.getByText('Library cleanup'));
    await user.click(screen.getByRole('button', { name: 'Restore example' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Restore example',
      }),
    );
    expect(stored().tracks.length).toBeGreaterThan(100);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
  it('downloads current memory after a failed save and reports download failures', async () => {
    const user = userEvent.setup();
    const download = vi
      .spyOn(files, 'downloadSoundboard')
      .mockImplementation(() => undefined);
    renderPage();
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await user.click(screen.getByRole('button', { name: 'Favorite: Rain' }));
    const leaving = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaving);
    expect(leaving.defaultPrevented).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Download current library' }));
    expect(download).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tracks: expect.arrayContaining([
          expect.objectContaining({ id: 'rain', favorite: true }),
        ]),
      }),
    );
    download.mockImplementation(() => {
      throw new Error('download');
    });
    await user.click(screen.getByRole('button', { name: 'Download current library' }));
    expect(screen.getByText(/backup could not be downloaded/)).toBeInTheDocument();
    failure.mockRestore();
    download.mockImplementation(() => undefined);
    await user.click(screen.getByRole('button', { name: 'Download current library' }));
    expect(screen.queryByText(/backup could not be downloaded/)).toBeNull();
    await user.click(screen.getByText('Library cleanup'));
    expect(screen.queryByRole('button', { name: 'Download backup' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Data Backup' })[0]).toHaveAttribute(
      'href',
      '/data/',
    );
  });
  it('offers original contents, retries reads, and never replaces them after cancellation', async () => {
    localStorage.setItem('fumble-soundboard', '{broken');
    await useSoundboardStore.persist.rehydrate();
    const original = vi
      .spyOn(files, 'downloadSoundboardFile')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Download original contents' }));
    expect(original).toHaveBeenCalledWith('{broken', 'fumble-soundboard-original.json');
    await user.click(screen.getByRole('button', { name: 'Retry reading' }));
    await user.click(screen.getByText('Library cleanup'));
    await user.click(screen.getByRole('button', { name: 'Clear soundboard' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(localStorage.getItem('fumble-soundboard')).toBe('{broken');
  });
  it('keeps search when resetting filters, offers an empty favorites state and stops on request', async () => {
    const user = userEvent.setup();
    renderPage('/dm/soundboard?category=ambience&sort=recent');
    await user.click(screen.getByRole('button', { name: 'Rain' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.queryByRole('region', { name: 'Test player' })).toBeNull();
    await user.type(screen.getByRole('searchbox'), 'Rain');
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('searchbox')).toHaveValue('Rain');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.click(screen.getByRole('button', { name: 'Favorite: Battle' }));
    await user.click(screen.getByRole('button', { name: 'Favorites (0)' }));
    expect(screen.getByText(/No favorites match/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Favorites (0)' }));
    await user.click(screen.getByRole('button', { name: 'Add a track or playlist' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('responds to store updates while mounted', () => {
    renderPage();
    act(() => stored().toggleFavorite('rain'));
    expect(screen.getByRole('button', { name: 'Favorite: Rain' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('keeps original and localized names on category edits, while retaining explicit renames', async () => {
    const id = 'bardify-ewceCUF4qtU';
    const original = 'Floating Peace | D&D/TTRPG Music | 1 Hour';
    const localized = plNames[id];
    useSoundboardStore.setState({ tracks: [{ ...tracks[0]!, id, name: original }] });
    const user = userEvent.setup();
    const view = renderPage('/pl/dm/soundboard');
    await user.click(screen.getByRole('button', { name: `Edytuj ${localized}` }));
    await user.selectOptions(
      within(screen.getByRole('dialog')).getByRole('combobox'),
      'combat',
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Zapisz' }),
    );
    expect(stored().tracks[0]).toMatchObject({
      name: original,
      customName: false,
      category: 'combat',
    });
    expect(screen.getByRole('button', { name: localized })).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'Floating Peace');
    expect(screen.getByRole('button', { name: localized })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Edytuj ${localized}` }));
    const name = within(screen.getByRole('dialog')).getByRole('textbox', {
      name: 'Nazwa',
    });
    await user.clear(name);
    await user.type(name, 'Forest calm');
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Zapisz' }),
    );
    await user.clear(screen.getByRole('searchbox'));
    await user.click(screen.getByRole('button', { name: 'Edytuj Forest calm' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Zapisz' }),
    );
    expect(stored().tracks[0]).toMatchObject({ name: 'Forest calm', customName: true });
    view.unmount();
    renderPage();
    expect(screen.getByRole('button', { name: 'Forest calm' })).toBeInTheDocument();
  });

  it('closes forms with Escape or Cancel, and saves category names explicitly', async () => {
    const user = userEvent.setup();
    renderPage('/dm/soundboard?category=ambience');
    await user.click(screen.getByRole('button', { name: 'All (2)' }));
    await user.click(screen.getByRole('button', { name: 'Add a track or playlist' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Edit Rain' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Edit Rain' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(stored().tracks[0]?.name).toBe('Rain');
    await user.click(screen.getByRole('button', { name: 'Manage categories' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Rename Ambience' }));
    await user.clear(within(dialog).getByRole('textbox', { name: 'Category name' }));
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Category name' }),
      'Weather',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(stored().categories[0]?.name).toBe('Weather');
    await user.click(within(dialog).getByRole('button', { name: 'Remove Weather' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    expect(stored().categories[0]?.name).toBe('Weather');
  });

  it('resets an active category when deleting it and preserves a non-playing deletion undo', async () => {
    const user = userEvent.setup();
    renderPage('/dm/soundboard?category=ambience');
    await user.click(screen.getByRole('button', { name: 'Manage categories' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove Ambience' }),
    );
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }),
    );
    expect(screen.getByRole('button', { name: 'All (2)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Remove Rain' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(stored().tracks).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stored().tracks).toHaveLength(2);
  });
});
