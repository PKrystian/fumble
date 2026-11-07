import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';

export function NotFoundPage() {
  const { t } = useT();
  useSeo(t('notFound.title'), t('notFound.message'), false);
  return (
    <div className="flex flex-col items-center gap-4 text-center page-shell">
      <p className="font-display text-6xl font-bold text-ember-400">404</p>
      <h1 className="page-title">{t('notFound.title')}</h1>
      <p className="text-ink-200">{t('notFound.message')}</p>
      <Link
        to="/"
        className="rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-600"
      >
        {t('notFound.backLink')}
      </Link>
    </div>
  );
}
