import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { navSections, type NavAccent } from '@/app/navigation';
import { Link, NavLink } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { LanguageSwitcher } from '@/features/ui/LanguageSwitcher';
import { ContentModeSwitcher } from '@/features/ui/ContentModeSwitcher';
import { Logo } from '@/features/ui/Logo';
import { GlobalSearch } from '@/features/search/GlobalSearch';
import { useSidebarStore } from '@/features/ui/sidebarStore';

interface SidebarProps {
  onNavigate?: () => void;

  collapsible?: boolean;
}

const sectionColors: Record<NavAccent, string> = {
  arcane: 'text-arcane-300',
  teal: 'text-cyan-300',
  violet: 'text-violet-300',
  ember: 'text-ember-400',
  slate: 'text-ink-300',
};

export function Sidebar({ onNavigate, collapsible = true }: SidebarProps) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const { t } = useT();
  const showLabels = !collapsed || !collapsible;

  return (
    <nav
      aria-label={t('common.primaryNav')}
      className={[
        'flex h-full flex-col gap-1 overflow-y-auto overflow-x-hidden py-4',
        showLabels ? '' : 'items-center',
      ].join(' ')}
    >
      <div
        className={[
          'mb-3 flex items-center gap-2 pt-1',
          showLabels ? 'justify-between px-4' : 'justify-center px-2',
        ].join(' ')}
      >
        {showLabels && (
          <Link
            to="/"
            onClick={onNavigate}
            aria-label={t('common.returnHome')}
            className="flex items-center gap-2 rounded-md font-display text-2xl font-black tracking-tight text-ink-50 transition-colors hover:text-arcane-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-arcane-400"
          >
            <Logo className="h-8 w-8 text-ink-50" />
            Fumble
          </Link>
        )}
        {collapsible && (
          <button
            type="button"
            onClick={toggle}
            aria-label={
              collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')
            }
            className="rounded-md p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      <div className={showLabels ? 'mb-2 px-4' : 'mb-2 px-2'}>
        <GlobalSearch compact={!showLabels} />
      </div>

      <div className={showLabels ? 'mb-2 px-4' : 'mb-2 px-2'}>
        <ContentModeSwitcher compact={!showLabels} />
      </div>

      <div className={showLabels ? 'mb-4 px-4' : 'mb-4 px-2'}>
        <LanguageSwitcher compact={!showLabels} />
      </div>

      <NavLink
        to="/"
        end
        onClick={onNavigate}
        title={showLabels ? undefined : t('nav.home')}
        className="group relative mb-1 flex w-full items-center text-sm"
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden="true"
              className={[
                'absolute inset-y-0.5 left-0 w-[3px] rounded-r-sm',
                isActive ? 'bg-arcane-500' : 'bg-transparent',
              ].join(' ')}
            />
            <span
              className={[
                'flex flex-1 items-center gap-3 rounded-md py-2',
                showLabels ? 'mx-2 px-3' : 'mx-1 justify-center px-2',
                isActive
                  ? 'bg-arcane-700 font-semibold text-white'
                  : 'font-medium text-ink-200 group-hover:bg-ink-800/60 group-hover:text-ink-50',
              ].join(' ')}
            >
              <Home size={18} aria-hidden="true" className="shrink-0" />
              {showLabels && <span>{t('nav.home')}</span>}
            </span>
          </>
        )}
      </NavLink>

      {navSections.map((section, index) => (
        <div key={section.titleKey} className="flex w-full flex-col gap-0.5">
          <div
            className={[
              'border-t border-ink-800',
              index > 0 ? 'mb-2 mt-3' : 'mb-2 mt-2',
              showLabels ? 'mx-4' : 'mx-2',
            ].join(' ')}
          />
          {showLabels && (
            <p
              className={`mb-1 px-4 text-[0.68rem] font-bold uppercase tracking-[0.14em] ${sectionColors[section.accent]}`}
            >
              {t(section.titleKey)}
            </p>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={showLabels ? undefined : t(item.labelKey)}
              className="group relative flex w-full items-center text-sm"
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute inset-y-0.5 left-0 w-[3px] rounded-r-sm transition-colors',
                      isActive ? 'bg-arcane-500' : 'bg-transparent',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'flex flex-1 items-center gap-3 rounded-md py-1.5 transition-colors',
                      showLabels ? 'mx-2 px-3' : 'mx-1 justify-center px-2',
                      isActive
                        ? 'bg-arcane-700 font-semibold text-white'
                        : 'font-medium text-ink-200 group-hover:bg-ink-800/60 group-hover:text-ink-50',
                    ].join(' ')}
                  >
                    <item.icon
                      size={18}
                      aria-hidden="true"
                      className={[
                        'shrink-0',
                        isActive
                          ? 'text-white'
                          : 'text-ink-400 transition-colors group-hover:text-ink-200',
                      ].join(' ')}
                    />
                    {showLabels && <span>{t(item.labelKey)}</span>}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
