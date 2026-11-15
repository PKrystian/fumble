import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Link } from 'react-router-dom';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MapDraftGuard } from './MapDraftGuard';

function setup(dirty = true) {
  const download = vi.fn();
  function Page() {
    const [unsaved, setUnsaved] = useState(dirty);
    return (
      <>
        <MapDraftGuard
          dirty={unsaved}
          retry={() => setUnsaved(false)}
          download={download}
        />
        <Link to="/other">Go</Link>
      </>
    );
  }
  const router = createMemoryRouter([
    { path: '/', element: <Page /> },
    { path: '/other', element: <p>Other page</p> },
  ]);
  const view = render(<RouterProvider router={router} />);
  return { router, download, ...view };
}

describe('unsaved map navigation', () => {
  it('blocks refresh and navigation, keeps focus on stay, and permits an explicit discard', async () => {
    const { download } = setup();
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Go' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay on this page' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Download current draft' }));
    expect(download).toHaveBeenCalledOnce();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
  });
  it('continues the pending navigation after a successful retry', async () => {
    setup();
    fireEvent.click(screen.getByRole('link', { name: 'Go' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving draft' }));
    expect(await screen.findByText('Other page')).toBeInTheDocument();
  });
  it('does not block a saved map', async () => {
    setup(false);
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'Go' }));
    await waitFor(() => expect(screen.getByText('Other page')).toBeInTheDocument());
  });
});
