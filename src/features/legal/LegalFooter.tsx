import { ExternalLink } from 'lucide-react';
import packageInfo from '../../../package.json';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';

const CHANGELOG_URL = 'https://github.com/PKrystian/Fumble/blob/main/CHANGELOG.md';
const ISSUE_URL = 'https://github.com/PKrystian/Fumble/issues/new/choose';

export function LegalFooter() {
  const { t } = useT();
  const linkClass =
    'inline-flex min-h-8 items-center gap-1 rounded-lg transition-colors hover:text-ink-50 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-arcane-400';

  return (
    <footer className="border-t border-ink-700 px-4 py-8 text-sm text-ink-300 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <section>
          <h2 className="text-ink-50 section-title">Fumble</h2>
          <p className="mt-2 max-w-sm leading-6">{t('home.summary')}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <a
              className={linkClass}
              href="https://ko-fi.com/krystianpinczak"
              rel="noreferrer"
              target="_blank"
            >
              {t('legal.footer.support')}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <a
              className={linkClass}
              href="https://github.com/PKrystian/Fumble"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            <a className={linkClass} href={ISSUE_URL} rel="noreferrer" target="_blank">
              {t('legal.footer.reportIssue')}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </section>

        <nav aria-label={t('legal.footer.navigation')}>
          <h2 className="text-ink-100 section-title">{t('legal.footer.navigation')}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            <li>
              <Link className={linkClass} to="/">
                {t('nav.home')}
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/character">
                {t('nav.characterSheet')}
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/compendium/rules">
                {t('nav.rules')}
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/compendium/bestiary">
                {t('nav.bestiary')}
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/wiki">
                {t('nav.wiki')}
              </Link>
            </li>
            <li>
              <Link className={linkClass} to="/dice">
                {t('nav.diceRoller')}
              </Link>
            </li>
          </ul>
        </nav>

        <section>
          <h2 className="text-ink-100 section-title">{t('legal.footer.about')}</h2>
          <p className="mt-3 leading-6">{t('legal.footer.aboutBody')}</p>
        </section>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 border-t border-ink-700 pt-5 text-sm">
        <span>
          {t('legal.footer.version')}{' '}
          <a
            aria-label={t('legal.footer.versionLink', { version: packageInfo.version })}
            className={linkClass}
            href={CHANGELOG_URL}
            rel="noreferrer"
            target="_blank"
          >
            {packageInfo.version}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </span>
        <span>{t('legal.footer.copyright', { year: new Date().getFullYear() })}</span>
        <nav
          aria-label={t('legal.footerLabel')}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          <Link className={linkClass} to="/legal">
            {t('legal.overview.title')}
          </Link>
          <Link className={linkClass} to="/legal/privacy">
            {t('legal.privacy.title')}
          </Link>
          <Link className={linkClass} to="/legal/connections">
            {t('legal.connections.title')}
          </Link>
          <Link className={linkClass} to="/legal/terms">
            {t('legal.terms.title')}
          </Link>
          <Link className={linkClass} to="/legal/licenses">
            {t('legal.licenses.title')}
          </Link>
          <Link className={linkClass} to="/legal/accessibility">
            {t('legal.accessibility.title')}
          </Link>
          <Link className={linkClass} to="/legal/contact">
            {t('legal.contact.title')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
