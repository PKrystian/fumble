import packageInfo from '../../../package.json';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';

export function LegalFooter() {
  const { t } = useT();
  const linkClass =
    'rounded-sm transition-colors hover:text-ink-50 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-arcane-400';

  return (
    <footer className="border-t border-ink-800 px-6 py-8 text-sm text-ink-400">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <section>
          <h2 className="font-display text-lg font-bold text-ink-50">Fumble</h2>
          <p className="mt-2 max-w-sm leading-6">{t('home.summary')}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <a
              className={linkClass}
              href="https://ko-fi.com/krystianpinczak"
              rel="noreferrer"
              target="_blank"
            >
              {t('legal.footer.support')}
            </a>
            <a
              className={linkClass}
              href="https://github.com/PKrystian/Fumble"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </section>

        <nav aria-label={t('legal.footer.navigation')}>
          <h2 className="font-display font-bold text-ink-100">
            {t('legal.footer.navigation')}
          </h2>
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
          <h2 className="font-display font-bold text-ink-100">
            {t('legal.footer.about')}
          </h2>
          <p className="mt-3 leading-6">{t('legal.footer.aboutBody')}</p>
        </section>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-800 pt-5 text-xs">
        <span>{t('legal.footer.version', { version: packageInfo.version })}</span>
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
