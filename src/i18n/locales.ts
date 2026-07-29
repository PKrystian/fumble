export interface LocaleInfo {
  code: 'en' | 'pl';
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'pl', label: 'Polish', nativeLabel: 'Polski' },
];

export type Locale = (typeof SUPPORTED_LOCALES)[number]['code'];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.some((l) => l.code === value);
}
