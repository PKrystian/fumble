import { localizePath } from '../../i18n/pathUtils';
import type { Locale } from '../../i18n/locales';
import { slugify } from './transform';

export interface WikiHeading {
  id: string;
  title: string;
  level: number;
}

export function wikiText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Math.min(Number(code), 0x10ffff)),
    )
    .replace(
      /&(?:nbsp|amp|quot|apos|lt|gt|#39);/g,
      (entity) =>
        ({
          '&nbsp;': ' ',
          '&amp;': '&',
          '&quot;': '"',
          '&apos;': "'",
          '&#39;': "'",
          '&lt;': '<',
          '&gt;': '>',
        })[entity]!,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareWikiRoot(
  root: HTMLElement,
  locale: Locale,
  labels: { image: string; table: string; locked: string; empty: string },
  base = '/',
  search = '',
): WikiHeading[] {
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[data-wiki-link]')) {
    const target = anchor.dataset.wikiLink;
    if (target && /^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(target)) {
      anchor.setAttribute(
        'href',
        `${base.replace(/\/$/, '')}${localizePath(`/wiki/${target}`, locale)}${search}`,
      );
    }
  }
  for (const anchor of root.querySelectorAll('a[target="_blank"]'))
    anchor.setAttribute('rel', 'noopener noreferrer');
  for (const locked of root.querySelectorAll('.wiki-locked'))
    locked.textContent = labels.locked;
  for (const paragraph of root.querySelectorAll('p')) {
    if (paragraph.textContent?.trim().toLowerCase() === 'nothing here')
      paragraph.textContent = labels.empty;
  }
  for (const row of root.querySelectorAll('.wiki-infobox tr, .wiki-box tr')) {
    if (!row.querySelector('td')?.textContent?.trim()) row.remove();
  }
  for (const table of root.querySelectorAll<HTMLTableElement>('table')) {
    if (!table.rows.length) {
      table.remove();
      continue;
    }
    table.classList.add('data-table');
    for (const header of table.querySelectorAll('th'))
      header.setAttribute(
        'scope',
        header.closest('.wiki-infobox, .wiki-box') ? 'row' : 'col',
      );
    if (table.closest('.wiki-infobox, .wiki-box')) continue;
    const wrapper = root.ownerDocument.createElement('div');
    wrapper.className = 'wiki-table-scroll';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', labels.table);
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
  for (const image of root.querySelectorAll('img')) {
    if (image.closest('a')) continue;
    const link = root.ownerDocument.createElement('a');
    link.href = image.getAttribute('src') ?? '';
    link.className = 'artwork-trigger';
    link.dataset.imageViewer = '';
    link.setAttribute('aria-label', image.alt || labels.image);
    image.replaceWith(link);
    link.append(image);
  }
  const headings: WikiHeading[] = [];
  const ids = new Set([...root.querySelectorAll('[id]')].map((element) => element.id));
  for (const heading of root.querySelectorAll<HTMLElement>('h2, h3, h4')) {
    if (heading.closest('.wiki-infobox, .wiki-box')) continue;
    const title = heading.textContent?.trim();
    if (!title) continue;
    let id = heading.id;
    if (!id) {
      const prefix = `wiki-section-${slugify(title) || 'section'}`;
      id = prefix;
      let suffix = 2;
      while (ids.has(id)) id = `${prefix}-${suffix++}`;
      heading.id = id;
      ids.add(id);
    }
    headings.push({ id, title, level: Number(heading.tagName.slice(1)) });
    heading.tabIndex = -1;
  }
  return headings;
}
