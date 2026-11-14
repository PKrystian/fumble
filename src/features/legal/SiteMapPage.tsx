import { useContext } from 'react';
import { navSections } from '@/app/navigation';
import { categories } from '@/features/compendium/categories';
import { StaticReading } from '@/features/ui/staticReading';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { DISCOVERY_LINKS, LEGAL_PAGES, legalPath } from './links';

const pageLinks = [
  ...new Map(
    [
      { to: '/', label: 'nav.home' },
      ...DISCOVERY_LINKS,
      ...navSections.flatMap((section) =>
        section.items.map((item) => ({ to: item.to, label: item.labelKey })),
      ),
    ]
      .filter((link) => link.to !== '/site-map' && !link.to.startsWith('/compendium/'))
      .map((link) => [link.to, link]),
  ).values(),
];

export function SiteMapPage() {
  const { t } = useT();
  const staticReading = useContext(StaticReading);
  useSeo(t('siteMap.title'), t('siteMap.description'));
  return (
    <article className="page-shell">
      <header>
        <h1 className="page-title">{t('siteMap.title')}</h1>
        <p className="page-description">{t('siteMap.description')}</p>
      </header>
      <section className="mt-8" aria-labelledby="map-compendium">
        <h2 id="map-compendium" className="section-title">
          {t('nav.compendium')}
        </h2>
        <p className="mt-2 text-sm text-ink-400">{t('siteMap.catalogHint')}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                className="catalog-card h-full"
                reloadDocument={staticReading}
                to={
                  staticReading
                    ? `/compendium/${category.id}/browse/1`
                    : { pathname: `/compendium/${category.id}`, search: 'view=all' }
                }
              >
                <h3 className="font-semibold text-ink-100">
                  {t(`compendium.categories.${category.id}`)}
                </h3>
                <p className="mt-2 text-sm text-ink-400">
                  {t(`compendium.seo.categoryDescriptions.${category.id}`)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="section-title">{t('siteMap.tools')}</h2>
          <ul className="mt-3">
            {pageLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="document-link">
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="section-title">{t('legal.footer.help')}</h2>
          <ul className="mt-3">
            {LEGAL_PAGES.map((page) => (
              <li key={page}>
                <Link to={legalPath(page)} className="document-link">
                  {t(`legal.${page}.title`)}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/changelog" className="document-link">
                {t('changelog.title')}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}
