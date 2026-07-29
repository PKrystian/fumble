import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { alertDialog, confirmDialog, useDialogStore } from './confirmStore';
import { ConfirmDialog } from './ConfirmDialog';
import { ContentModeSwitcher } from './ContentModeSwitcher';
import { useContentModeStore } from './contentModeStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Lightbox } from './Lightbox';
import { useLightbox } from './lightboxStore';
import { useSidebarStore } from './sidebarStore';

function Location() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

const renderAt = (node: React.ReactNode, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              {node}
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('UI controls', () => {
  beforeEach(() => {
    localStorage.clear();
    useDialogStore.setState({ request: null });
    useContentModeStore.setState({ mode: 'all' });
    useLightbox.setState({ src: null, caption: '' });
    useSidebarStore.setState({ collapsed: false });
  });

  it('switches locale while preserving the route', () => {
    renderAt(<LanguageSwitcher />, '/compendium/spells?level=1');
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.click(screen.getByRole('option', { name: 'Polski' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/pl/compendium/spells');
  });

  it('closes language and content menus with Escape or outside clicks', () => {
    renderAt(
      <>
        <LanguageSwitcher compact />
        <ContentModeSwitcher compact />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Language' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Content edition' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Content edition' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Content edition' }));
    fireEvent.click(document.body);
    expect(screen.queryByRole('listbox', { name: 'Content edition' })).toBeNull();
  });

  it('keeps menus open for inside clicks and unrelated keys', () => {
    renderAt(
      <>
        <LanguageSwitcher />
        <ContentModeSwitcher />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change language' }));
    const languageMenu = screen.getByRole('listbox', { name: 'Language' });
    fireEvent.click(languageMenu);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(languageMenu).toBeVisible();
    fireEvent.click(screen.getByRole('option', { name: 'English' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');

    fireEvent.click(screen.getByRole('button', { name: 'Content edition' }));
    const contentMenu = screen.getByRole('listbox', { name: 'Content edition' });
    fireEvent.click(contentMenu);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(contentMenu).toBeVisible();
  });

  it('changes the selected content edition', () => {
    renderAt(<ContentModeSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Content edition' }));
    fireEvent.click(screen.getByRole('option', { name: 'D&D 2014 only' }));
    expect(useContentModeStore.getState().mode).toBe('2014');
  });

  it('renders and resolves confirmation and alert dialogs', async () => {
    renderAt(<ConfirmDialog />);
    let confirmation!: Promise<boolean>;
    act(() => {
      confirmation = confirmDialog('Remove entry?', { tone: 'danger' });
    });
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(confirmation).resolves.toBe(false);

    let alert!: Promise<void>;
    act(() => {
      alert = alertDialog('Saved');
    });
    expect(await screen.findByRole('alertdialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await expect(alert).resolves.toBeUndefined();
  });

  it('closes confirmation dialogs with Escape and backdrop', async () => {
    const view = renderAt(<ConfirmDialog />);
    let first!: Promise<boolean>;
    act(() => {
      first = confirmDialog('Question');
    });
    await screen.findByRole('alertdialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    await expect(first).resolves.toBe(false);

    let second!: Promise<boolean>;
    act(() => {
      second = confirmDialog('Another question');
    });
    fireEvent.click(await screen.findByRole('alertdialog'));
    await expect(second).resolves.toBe(false);
    view.unmount();
  });

  it('opens and closes the lightbox', () => {
    renderAt(<Lightbox />);
    act(() => useLightbox.getState().open('/portrait.webp', 'Hero portrait'));
    expect(screen.getByRole('dialog', { name: 'Image viewer' })).toBeVisible();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/portrait.webp');
    fireEvent.click(screen.getByRole('img'));
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the lightbox with the default caption', () => {
    act(() => useLightbox.getState().open('/portrait.webp'));
    expect(useLightbox.getState()).toMatchObject({
      src: '/portrait.webp',
      caption: '',
    });
  });

  it('toggles sidebar state', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });
});
