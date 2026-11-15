import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { prepareWikiRoot } from '../../src/features/wiki/content';
import { translate } from '../../src/i18n/translate';
import type { Locale } from '../../src/i18n/locales';
import { escapeHtml } from '../../src/features/wiki/transform';
import { WIKI_CONTENT_LOCALE } from '../../src/features/wiki/indexability';

const window = new JSDOM('').window;
const purify = createDOMPurify(window);

export function renderWikiArticle(html: string, locale: Locale, base = '/'): string {
  const root = window.document.createElement('div');
  root.innerHTML = purify.sanitize(html.replaceAll('%BASE%', base));
  const headings = prepareWikiRoot(
    root,
    locale,
    {
      image: translate(locale, 'common.imageViewer'),
      table: translate(locale, 'wiki.tableScroll'),
      locked: translate(locale, 'wiki.notYetUnlocked'),
      empty: translate(locale, 'wiki.emptyPage'),
    },
    base,
  );
  const contents =
    headings.length >= 3
      ? `<details class="wiki-contents mb-6 rounded-xl border border-ink-700 p-4"><summary>${escapeHtml(translate(locale, 'wiki.contents'))}</summary><nav class="mt-3 max-h-64 overflow-y-auto" aria-label="${escapeHtml(translate(locale, 'wiki.contents'))}"><ul>${headings.map((heading) => `<li><a class="back-link mb-0 underline" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.title)}</a></li>`).join('')}</ul></nav></details>`
      : '';
  const language =
    locale !== WIKI_CONTENT_LOCALE
      ? `<p class="notice">${escapeHtml(translate(locale, 'wiki.sourceLanguage'))}</p>`
      : '';
  return `${language}${contents}<div class="wiki-content reading-content" lang="${WIKI_CONTENT_LOCALE}">${root.innerHTML}</div>`;
}
