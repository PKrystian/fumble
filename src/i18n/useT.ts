import { useCallback } from 'react';
import { useLocale } from './pathUtils';
import { translate } from './translate';

export { translate } from './translate';

export function useT() {
  const locale = useLocale();
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
  return { locale, t };
}
