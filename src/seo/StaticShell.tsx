import { navSections } from '@/app/navigation';
import { LegalFooter } from '@/features/legal/LegalFooter';
import { Logo } from '@/features/ui/Logo';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import type { ReactNode } from 'react';

export function StaticShell({
  content,
  children,
}: {
  content?: string;
  children?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="static-shell">
      <a href="#static-main" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <aside className="static-sidebar">
        <Link
          to="/"
          className="mb-6 flex items-center gap-2 text-2xl font-bold text-ink-50"
        >
          <Logo size={32} />
          Fumble
        </Link>
        <StaticNavigation />
      </aside>
      <div className="static-body">
        <header className="border-b border-ink-700 px-4 py-3 md:hidden">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Logo size={28} />
            Fumble
          </Link>
          <details className="mt-3">
            <summary className="ui-tab cursor-pointer border border-ink-600">
              {t('common.openMenu')}
            </summary>
            <StaticNavigation />
          </details>
        </header>
        <main
          id="static-main"
          data-prerendered="true"
          tabIndex={-1}
          className={content !== undefined ? 'page-shell reading-content' : 'min-w-0'}
          {...(content !== undefined
            ? { dangerouslySetInnerHTML: { __html: content } }
            : { children })}
        />
        <LegalFooter />
      </div>
    </div>
  );
}

function StaticNavigation() {
  const { t } = useT();
  return (
    <nav aria-label={t('common.primaryNav')}>
      <Link to="/" className="selection-row">
        {t('nav.home')}
      </Link>
      {navSections.map((section) => (
        <section key={section.titleKey} className="mt-6">
          <h2 className="panel-title mb-2">{t(section.titleKey)}</h2>
          {section.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="selection-row flex items-center gap-3"
            >
              <item.icon size={18} aria-hidden="true" />
              {t(item.labelKey)}
            </Link>
          ))}
        </section>
      ))}
    </nav>
  );
}
