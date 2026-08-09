import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOCALE } from '../../src/i18n/locales';
import { translate } from '../../src/i18n/translate';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(ROOT, 'dist');

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

let html = readFileSync(join(DIST, 'index.html'), 'utf8');
const title = translate(DEFAULT_LOCALE, 'notFound.title');
const message = translate(DEFAULT_LOCALE, 'notFound.message');
const backLink = translate(DEFAULT_LOCALE, 'notFound.backLink');
const appMount = '<div id="root"><div id="app-root" data-app-ready="false"></div>';

html = html
  .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)} - Fumble</title>`)
  .replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/s,
    `<meta name="description" content="${escapeHtml(message)}" />`,
  )
  .replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?\s*>/s,
    '<meta name="robots" content="noindex, nofollow" />',
  )
  .replace(/\s*<link\s+rel="canonical"[^>]*\/?\s*>/g, '')
  .replace(/\s*<link\s+rel="alternate"[^>]*\/?\s*>/g, '')
  .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  .replace(/<main id="prerendered-content"[\s\S]*?<\/main>/, '')
  .replace(
    appMount,
    `${appMount}<main id="prerendered-content" data-prerendered="true"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/">${escapeHtml(backLink)}</a></main>`,
  );

writeFileSync(join(DIST, '404.html'), html);
