import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';

export function LegalFooter() {
  const { t } = useT();

  return (
    <footer className="border-t border-ink-800 px-6 py-5 text-xs text-ink-400">
      <nav
        aria-label={t('legal.footerLabel')}
        className="mx-auto flex max-w-6xl flex-wrap gap-4"
      >
        <Link className="hover:text-ink-100" to="/legal">
          {t('legal.overview.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/privacy">
          {t('legal.privacy.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/connections">
          {t('legal.connections.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/terms">
          {t('legal.terms.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/licenses">
          {t('legal.licenses.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/accessibility">
          {t('legal.accessibility.title')}
        </Link>
        <Link className="hover:text-ink-100" to="/legal/contact">
          {t('legal.contact.title')}
        </Link>
      </nav>
    </footer>
  );
}
