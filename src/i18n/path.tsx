import { forwardRef } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
  useLocation,
  useNavigate as useRouterNavigate,
} from 'react-router-dom';
import type {
  LinkProps,
  NavLinkProps,
  NavigateFunction,
  NavigateOptions,
  NavigateProps,
  To,
} from 'react-router-dom';
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
  const normalized = rest.startsWith('/') ? rest : `/${rest}`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === '/' ? `/${locale}` : `/${locale}${normalized}`;
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

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, ...props },
  ref,
) {
  const locale = useLocale();
  return <RouterLink ref={ref} to={localizeTo(to, locale)} {...props} />;
});

export function NavLink({ to, ...props }: NavLinkProps) {
  const locale = useLocale();
  return <RouterNavLink to={localizeTo(to, locale)} {...props} />;
}

export function Navigate({ to, ...props }: NavigateProps) {
  const locale = useLocale();
  return <RouterNavigate to={localizeTo(to, locale)} {...props} />;
}

export function useNavigate(): NavigateFunction {
  const locale = useLocale();
  const navigate = useRouterNavigate();
  const localizedNavigate = ((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') return navigate(to);
    return navigate(localizeTo(to, locale), options);
  }) as NavigateFunction;
  return localizedNavigate;
}
