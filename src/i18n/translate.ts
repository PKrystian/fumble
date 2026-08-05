import en from './dictionaries/en';
import pl from './dictionaries/pl';
import type { Locale } from './locales';

const dictionaries: Record<Locale, unknown> = { en, pl };

function lookup(dict: unknown, path: string[]): unknown {
  return path.reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(value: string, vars?: Record<string, string | number>): string {
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const path = key.split('.');
  const value = lookup(dictionaries[locale], path) ?? lookup(dictionaries.en, path);
  return typeof value === 'string' ? interpolate(value, vars) : key;
}
