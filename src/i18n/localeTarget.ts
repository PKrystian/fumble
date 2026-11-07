import { DEFAULT_LOCALE, type Locale } from './locales';
import { localizePath } from './pathUtils';

export function rememberedLocaleTarget(
  pathname: string,
  search: string,
  hash: string,
  preferredLocale: Locale,
): string | null {
  if (pathname !== '/' || preferredLocale === DEFAULT_LOCALE) {
    return null;
  }
  return `${localizePath(pathname, preferredLocale)}${search}${hash}`;
}
