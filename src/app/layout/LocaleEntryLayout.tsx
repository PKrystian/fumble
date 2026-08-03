import { Navigate, useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { useLocaleStore } from '@/i18n/store';
import { rememberedLocaleTarget } from '@/i18n/localeTarget';
import { LocaleLayout } from './LocaleLayout';

export function LocaleEntryLayout() {
  const preferredLocale = useLocaleStore((state) => state.locale);
  const location = useLocation();
  const target = rememberedLocaleTarget(
    location.pathname,
    location.search,
    location.hash,
    preferredLocale,
  );

  if (target) return <Navigate to={target} replace />;

  return <LocaleLayout locale={DEFAULT_LOCALE} />;
}
