import { forwardRef } from 'react';
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  Navigate as RouterNavigate,
} from 'react-router-dom';
import type { LinkProps, NavLinkProps, NavigateProps, To } from 'react-router-dom';
import { localizePath, useLocale } from './pathUtils';

function localizeTo(to: To, locale: ReturnType<typeof useLocale>): To {
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
