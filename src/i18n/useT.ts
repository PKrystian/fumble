import { useLocale } from './pathUtils';
import { translate } from './translate';

export { translate } from './translate';

export function useT() {
  const locale = useLocale();
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  return { locale, t };
}
