import { useEffect } from 'react';
import type { Locale } from '@/i18n/locales';
import { useLocaleStore } from '@/i18n/store';
import { useHreflangTags } from '@/seo/useHreflangTags';
import { translate } from '@/i18n/useT';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AppLayout } from './AppLayout';

export function LocaleLayout({ locale }: { locale: Locale }) {
  const setLocale = useLocaleStore((s) => s.setLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    setLocale(locale);
  }, [locale, setLocale]);

  useHreflangTags();

  return (
    <AppErrorBoundary
      title={translate(locale, 'errors.appTitle')}
      message={translate(locale, 'errors.appMessage')}
      reloadLabel={translate(locale, 'errors.reload')}
    >
      <AppLayout />
    </AppErrorBoundary>
  );
}
