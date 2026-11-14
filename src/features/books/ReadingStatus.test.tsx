import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmDialog } from '@/features/ui/confirmStore';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { ReadingStatus } from './ReadingStatus';
import { useBookReading } from './readingStore';
import {
  BOOK_READING_KEY,
  emptyBookReading,
  parseBookReading,
  serializeBookReading,
} from './readingData';

vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog: vi.fn() }));
vi.mock('@/features/storage/downloadFile', () => ({ downloadTextFile: vi.fn() }));

const data = {
  ...emptyBookReading,
  wide: true,
  positions: { xphb: { chapter: 2, updatedAt: 100 } },
};

function show(allowClear = false) {
  return render(
    <MemoryRouter>
      <ReadingStatus allowClear={allowClear} />
    </MemoryRouter>,
  );
}

describe('reading recovery controls', () => {
  beforeEach(() => {
    localStorage.clear();
    useBookReading.setState({ data, status: 'ready', raw: null });
    vi.resetAllMocks();
  });

  it('retries an unsaved position and links to the backup page', () => {
    useBookReading.setState({ status: 'unsaved' });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('link', { name: 'Data Backup' })).toHaveAttribute(
      'href',
      '/data/',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(parseBookReading(localStorage.getItem(BOOK_READING_KEY)!)).toEqual(data);
  });

  it('offers the original unreadable data and only replaces it after confirmation', async () => {
    localStorage.setItem(BOOK_READING_KEY, 'unreadable');
    useBookReading.setState({ status: 'unreadable', raw: 'unreadable' });
    show();
    fireEvent.click(
      screen.getByRole('button', { name: 'Download original reading data' }),
    );
    expect(downloadTextFile).toHaveBeenCalledWith(
      'unreadable',
      'fumble-book-reading-original.json',
    );
    const replace = screen.getByRole('button', { name: 'Save this copy' });
    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    fireEvent.click(replace);
    expect(localStorage.getItem(BOOK_READING_KEY)).toBe('unreadable');
    fireEvent.click(replace);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(parseBookReading(localStorage.getItem(BOOK_READING_KEY)!)).toEqual(data);
  });

  it('lets the reader keep a valid competing copy and handles a removed copy', async () => {
    const raw = serializeBookReading(emptyBookReading);
    localStorage.setItem(BOOK_READING_KEY, raw);
    useBookReading.setState({ status: 'conflict', raw });
    show();
    expect(screen.getByRole('alert')).toHaveTextContent('changed in another tab');
    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const keep = screen.getByRole('button', { name: 'Keep saved copy' });
    fireEvent.click(keep);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(keep);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(useBookReading.getState().data).toEqual(emptyBookReading);

    localStorage.removeItem(BOOK_READING_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      useBookReading.setState({ status: 'conflict', raw: null });
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Keep saved copy' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Download original reading data' }),
    ).not.toBeInTheDocument();
  });

  it('preserves preferences when clearing confirmed history', async () => {
    show(true);
    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const clear = screen.getByRole('button', { name: 'Clear reading history' });
    fireEvent.click(clear);
    expect(useBookReading.getState().data.positions).toEqual(data.positions);
    fireEvent.click(clear);
    await waitFor(() => expect(clear).not.toBeInTheDocument());
    expect(useBookReading.getState().data).toEqual({ ...data, positions: {} });
  });
});
