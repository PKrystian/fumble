import { ExternalLink } from 'lucide-react';
import packageInfo from '../../../package.json';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { DISCOVERY_LINKS, LEGAL_PAGES, legalPath, REPOSITORY_URL } from './links';
import { releaseAnchor } from './changelog';

export function LegalFooter() {
  const { t } = useT();
  return (
    <footer className="border-t border-ink-700 px-4 py-6 text-sm text-ink-300 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <section>
          <h2 className="section-title text-ink-50">Fumble</h2>
          <p className="mt-2 max-w-sm leading-6">{t('legal.footer.summary')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            {[
              {
                href: 'https://ko-fi.com/krystianpinczak',
                label: 'legal.footer.support',
              },
              { href: REPOSITORY_URL, label: 'legal.footer.github' },
              {
                href: REPOSITORY_URL + '/issues/new/choose',
                label: 'legal.footer.reportIssue',
              },
            ].map((link) => (
              <a
                key={link.href}
                className="footer-link"
                href={link.href}
                rel="noreferrer"
                target="_blank"
              >
                {t(link.label)}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
        <nav aria-label={t('legal.footer.navigation')}>
          <h2 className="section-title text-ink-100">{t('legal.footer.navigation')}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4">
            {DISCOVERY_LINKS.map((link) => (
              <li key={link.to}>
                <Link className="footer-link" to={link.to}>
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('legal.footerLabel')}>
          <h2 className="section-title text-ink-100">{t('legal.footer.help')}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4">
            {LEGAL_PAGES.map((page) => (
              <li key={page}>
                <Link className="footer-link" to={legalPath(page)}>
                  {t('legal.' + page + '.title')}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-5 flex max-w-6xl flex-wrap items-center justify-between gap-x-4 border-t border-ink-700 pt-3">
        <span>{t('legal.footer.copyright', { year: new Date().getFullYear() })}</span>
        <Link
          className="footer-link"
          to={'/changelog#' + releaseAnchor(packageInfo.version)}
          aria-label={t('legal.footer.versionLink', { version: packageInfo.version })}
        >
          {t('legal.footer.version')} {packageInfo.version}
        </Link>
      </div>
    </footer>
  );
}
