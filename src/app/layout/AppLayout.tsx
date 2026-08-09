import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { RollResultDock } from '@/features/dice/RollResultDock';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { Lightbox } from '@/features/ui/Lightbox';
import { useSidebarStore } from '@/features/ui/sidebarStore';
import { Logo } from '@/features/ui/Logo';
import { useSearchStore } from '@/features/search/searchStore';
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
      <span>{t('common.storageError')}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 rounded-md border border-red-400/50 px-2 py-1 text-red-100 hover:bg-red-400/10"
      >
        {t('common.close')}
      </button>
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

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialogRef = useDialogFocus(mobileOpen);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const searchOpen = useSearchStore((s) => s.open);
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const { t } = useT();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!location.pathname.includes('/compendium/')) {
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

    const main = document.getElementById('main-content');
    if (!main) return;
    main.scrollTop = 0;
    main.scrollLeft = 0;
  }, [location.pathname]);

  return (
    <div className="flex h-full">
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-[100] rounded-md bg-ink-50 px-3 py-2 text-ink-950 focus:not-sr-only"
      >
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
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-ink-700 bg-ink-900 px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label={mobileOpen ? t('common.closeMenu') : t('common.openMenu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md p-1 text-ink-200 hover:bg-ink-800 hover:text-ink-50"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="flex items-center gap-1.5 font-display text-xl font-black tracking-tight text-ink-50">
            <Logo className="h-7 w-7 text-ink-50" />
            Fumble
          </span>
        </header>

        <main
          id="main-content"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
          tabIndex={-1}
        >
          <div className="flex-1">
            <Outlet />
          </div>
          <LegalFooter />
        </main>
      </div>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchPalette />
        </Suspense>
      )}
      <RollResultDock />
      <Lightbox />
      <ConfirmDialog />
      <StorageNotice />
    </div>
  );
}
