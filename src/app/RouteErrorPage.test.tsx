import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reload: vi.fn(), backup: vi.fn() }));
vi.mock('./reload', () => ({ reloadPage: mocks.reload }));
vi.mock('@/features/data/emergencyBackup', () => ({
  downloadStoredBackup: mocks.backup,
}));

import { isChunkLoadError } from './chunkError';
import { RouteErrorPage } from './RouteErrorPage';

function renderFailure(error: unknown, path = '/broken') {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { path: '/', element: <p>Home page</p> },
          { path: '/pl', element: <p>Strona domowa</p> },
          {
            path: '*',
            loader: () => {
              throw error;
            },
            element: <p>Never</p>,
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

const chunkError = () =>
  new TypeError('Failed to fetch dynamically imported module: /assets/Page.js');

describe('RouteErrorPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.reload.mockReset();
    mocks.backup.mockReset();
  });

  it('recognizes failed lazy chunks', () => {
    expect(isChunkLoadError(chunkError())).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Other'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });

  it('shows recovery actions for a page failure without reloading', async () => {
    renderFailure(new Error('render failed'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page could not be loaded',
    );
    expect(screen.getByText(/Reload Fumble or return to the home page/)).toBeVisible();
    expect(mocks.reload).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reload Fumble' }));
    expect(mocks.reload).toHaveBeenCalledTimes(1);

    mocks.backup.mockReturnValueOnce(true).mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Download data backup' }));
    expect(
      screen.getByText('The backup contains the data saved in this browser.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download data backup' }));
    expect(screen.getByText('The backup could not be created.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('reloads once after a failed chunk and then waits for the user', async () => {
    const first = renderFailure(chunkError(), '/pl/broken');
    expect(await screen.findByText(/prawdopodobnie został zaktualizowany/)).toBeVisible();
    expect(mocks.reload).toHaveBeenCalledTimes(1);
    first.unmount();

    renderFailure(chunkError());
    expect(await screen.findByText(/was probably updated/)).toBeVisible();
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload automatically when session storage is unavailable', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderFailure(chunkError());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mocks.reload).not.toHaveBeenCalled();
    getItem.mockRestore();
  });
});
