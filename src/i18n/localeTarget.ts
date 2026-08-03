import { DEFAULT_LOCALE, type Locale } from './locales';
import { localizePath, stripLocale } from './path';

export function rememberedLocaleTarget(
  pathname: string,
  search: string,
  hash: string,
  preferredLocale: Locale,
): string | null {
  const { locale, rest } = stripLocale(pathname);
  if (locale !== DEFAULT_LOCALE || rest !== '/' || preferredLocale === DEFAULT_LOCALE) {
    return null;
  }
  return `${localizePath(rest, preferredLocale)}${search}${hash}`;
}
