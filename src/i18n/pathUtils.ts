import { useLocation, useNavigate as useRouterNavigate } from 'react-router-dom';
import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from './locales';

export function stripLocale(pathname: string): { locale: Locale; rest: string } {
  for (const { code } of SUPPORTED_LOCALES) {
    if (code === DEFAULT_LOCALE) continue;
    const prefix = `/${code}`;
    if (pathname === prefix) return { locale: code, rest: '/' };
    if (pathname.startsWith(`${prefix}/`)) {
      return { locale: code, rest: pathname.slice(prefix.length) };
    }
  }
  return { locale: DEFAULT_LOCALE, rest: pathname || '/' };
}

export function localizePath(rest: string, locale: Locale): string {
  const prefixed = rest.startsWith('/') ? rest : `/${rest}`;
  const normalized = prefixed === '/' ? prefixed : `${prefixed.replace(/\/+$/, '')}/`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === '/' ? `/${locale}/` : `/${locale}${normalized}`;
}

export function useLocale(): Locale {
  return stripLocale(useLocation().pathname).locale;
}

function localizeTo(to: To, locale: Locale): To {
  if (typeof to === 'string') {
    return to.startsWith('/') ? localizePath(to, locale) : to;
  }
  if (to.pathname?.startsWith('/')) {
    return { ...to, pathname: localizePath(to.pathname, locale) };
  }
  return to;
}

export function useNavigate(): NavigateFunction {
  const locale = useLocale();
  const navigate = useRouterNavigate();
  return ((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') return navigate(to);
    return navigate(localizeTo(to, locale), options);
  }) as NavigateFunction;
}
