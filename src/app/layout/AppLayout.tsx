import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { RollResultDock } from '@/features/dice/RollResultDock';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { Lightbox } from '@/features/ui/Lightbox';
import { useSidebarStore } from '@/features/ui/sidebarStore';
import { Logo } from '@/features/ui/Logo';
import { SearchPalette } from '@/features/search/SearchPalette';
import { useT } from '@/i18n/useT';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const location = useLocation();
  const { t } = useT();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full">
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
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80vw] border-r border-ink-700 bg-ink-900 shadow-xl">
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

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <SearchPalette />
      <RollResultDock />
      <Lightbox />
      <ConfirmDialog />
    </div>
  );
}
