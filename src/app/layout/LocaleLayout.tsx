import { useEffect } from 'react';
import type { Locale } from '@/i18n/locales';
import { translate } from '@/i18n/useT';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { AppLayout } from './AppLayout';

export function LocaleLayout({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
