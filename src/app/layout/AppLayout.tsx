import { Button, IconButton } from '@/features/ui/primitives';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { RollResultDock } from '@/features/dice/RollResultDock';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { Lightbox } from '@/features/ui/Lightbox';
import { useSidebarStore } from '@/features/ui/sidebarStore';
import { Logo } from '@/features/ui/Logo';
import { useSearchStore } from '@/features/search/searchStore';
import { Link } from '@/i18n/path';
import { stripLocale } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { LegalFooter } from '@/features/legal/LegalFooter';
import { revealApp } from '@/seo/prerendered';
import { STORAGE_ERROR_EVENT } from '@/features/storage/safeStorage';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { Sidebar } from './Sidebar';

const SearchPalette = lazy(() =>
  import('@/features/search/SearchPalette').then((module) => ({
    default: module.SearchPalette,
  })),
);

function StorageNotice() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onStorageError = () => setVisible(true);
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError);
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[90] flex items-center justify-between gap-3 rounded-lg border border-red-400/50 bg-ink-900 p-3 text-sm text-red-200 shadow-xl md:left-auto md:max-w-md"
    >
      <span>
        {t('common.storageError')}{' '}
        <Link to="/data" className="font-medium text-ink-50 underline">
          {t('home.backupReminder.open')}
        </Link>
      </span>
      <Button
        type="button"
        onClick={() => setVisible(false)}
        size="sm"
        className="shrink-0"
      >
        {t('common.close')}
      </Button>
    </div>
  );
}

function classRouteKey(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const compendiumIndex = segments.indexOf('compendium');
  if (
    compendiumIndex < 0 ||
    segments[compendiumIndex + 1] !== 'classes' ||
    segments.length > compendiumIndex + 4
  )
    return undefined;
  return segments[compendiumIndex + 2];
}

function sectionOf(pathname: string): string {
  return stripLocale(pathname).rest.split('/')[1] ?? '';
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialogRef = useDialogFocus(mobileOpen, () => setMobileOpen(false));
  const collapsed = useSidebarStore((s) => s.collapsed);
  const searchOpen = useSearchStore((s) => s.open);
  const setSearchOpen = useSearchStore((s) => s.setOpen);
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const announcedPathname = useRef(location.pathname);
  const initialPathname = useRef(location.pathname);
  const [announcement, setAnnouncement] = useState('');
  const { t } = useT();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (
      !location.pathname.includes('/compendium/') &&
      !/^\/(?:pl\/)?books\/[^/]+/.test(location.pathname)
    ) {
      revealApp();
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    const previous = previousPathname.current;
    previousPathname.current = location.pathname;
    if (
      previous !== location.pathname &&
      classRouteKey(previous) === classRouteKey(location.pathname) &&
      classRouteKey(location.pathname) !== undefined
    )
      return;

    const main = document.getElementById('app-scroll');
    if (!main) return;
    main.scrollTop = 0;
    main.scrollLeft = 0;
  }, [location.pathname]);

  useEffect(() => {
    const previous = announcedPathname.current;
    if (previous === location.pathname) return;
    announcedPathname.current = location.pathname;
    setAnnouncement(document.title);
    const main = document.getElementById('main-content');
    const active = document.activeElement;
    if (
      main &&
      (active === document.body ||
        (sectionOf(previous) !== sectionOf(location.pathname) && !main.contains(active)))
    )
      main.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (announcedPathname.current !== initialPathname.current)
        setAnnouncement(document.title);
    });
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <aside
        className={[
          'hidden shrink-0 border-r border-ink-700 bg-ink-900 transition-[width] md:block',
          collapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={t('common.closeMenu')}
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={mobileDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('common.primaryNav')}
            tabIndex={-1}
            className="absolute inset-y-0 left-0 w-72 max-w-[80vw] border-r border-ink-700 bg-ink-900 shadow-xl"
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} collapsible={false} />
            <Button
              aria-label={t('common.closeMenu')}
              onClick={() => setMobileOpen(false)}
              variant="ghost"
              size="sm"
              iconOnly
              className="absolute right-3 top-3"
            >
              <X size={20} aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 md:hidden">
          <Button
            type="button"
            aria-label={mobileOpen ? t('common.closeMenu') : t('common.openMenu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            variant="ghost"
            size="sm"
            iconOnly
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
          <Link
            to="/"
            aria-label={t('common.returnHome')}
            className="flex items-center gap-1.5 rounded-md font-display text-xl font-black tracking-tight text-ink-50"
          >
            <Logo className="h-7 w-7 text-ink-50" />
            Fumble
          </Link>
          <IconButton
            label={t('search.title')}
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} aria-hidden="true" />
          </IconButton>
        </header>

        <div id="app-scroll" className="app-scroll">
          <main
            id="main-content"
            className="flex min-h-min min-w-0 flex-col focus:outline-none"
            tabIndex={-1}
          >
            <div className="flex-1">
              <Outlet />
            </div>
          </main>
          <LegalFooter />
        </div>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchPalette />
        </Suspense>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <RollResultDock />
      <Lightbox />
      <ConfirmDialog />
      <StorageNotice />
    </div>
  );
}
