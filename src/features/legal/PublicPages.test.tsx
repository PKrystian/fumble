import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { categories } from '@/features/compendium/categories';
import { navSections } from '@/app/navigation';
import { StaticReading } from '@/features/ui/staticReading';
import { renderPublicPage } from '@/seo/staticEntryRenderer';
import { LegalReference, LegalText } from './LegalText';
import { ChangelogPage } from './ChangelogPage';
import { SiteMapPage } from './SiteMapPage';
import { LEGAL_DATES, LEGAL_PAGES, legalPath } from './links';
import { parseChangelog, releaseAnchor } from './changelog';

describe('public documents', () => {
  it('parses release sections, multiline notes, CRLF and prereleases', () => {
    expect(parseChangelog('No releases\n## Unknown')).toEqual([]);
    expect(
      parseChangelog(
        '# History\r\n- ignored\r\n## 2.0.0-beta.1 - 2026-11-07\r\n  ignored\r\n- First `change`\r\n  continued\r\n\r\n## 1.0.0 - 2026-01-01\r\n- Initial',
      ),
    ).toEqual([
      {
        version: '2.0.0-beta.1',
        date: '2026-11-07',
        notes: ['First `change` continued'],
      },
      { version: '1.0.0', date: '2026-01-01', notes: ['Initial'] },
    ]);
    expect(releaseAnchor('2.0.0-beta.1')).toBe('version-2-0-0-beta-1');
  });

  it('renders named references without interpreting HTML or unknown tokens', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pl/legal/privacy/']}>
        <LegalText text={'<script>bad</script> [[backup]], [[mit]], [[unknown]]'} />
        <LegalReference reference="contact" action />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Kopia danych' })).toHaveAttribute(
      'href',
      '/pl/data/',
    );
    expect(screen.getByRole('link', { name: /MIT/ })).toHaveAttribute(
      'rel',
      'noreferrer',
    );
    expect(screen.getByRole('link', { name: 'Właściciel i kontakt' })).toHaveClass(
      'document-link',
    );
    expect(container).toHaveTextContent('[[unknown]]');
    expect(container.querySelector('script')).toBeNull();
  });

  it.each(['/', '/pl/'])(
    'links every category in the interactive site map: %s',
    (prefix) => {
      render(
        <MemoryRouter initialEntries={[`${prefix}site-map/`]}>
          <SiteMapPage />
        </MemoryRouter>,
      );
      for (const category of categories)
        expect(
          document.querySelector(
            `a[href="${prefix}compendium/${category.id}/?view=all"]`,
          ),
        ).not.toBeNull();
      for (const section of navSections)
        for (const item of section.items) {
          if (!item.to.startsWith('/compendium/'))
            expect(
              document.querySelector(`a[href="${prefix}${item.to.slice(1)}/"]`),
            ).not.toBeNull();
        }
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        prefix === '/' ? 'Site map' : 'Mapa strony',
      );
    },
  );

  it('links static catalogs directly without requiring JavaScript', () => {
    render(
      <MemoryRouter initialEntries={['/pl/site-map/']}>
        <StaticReading value>
          <SiteMapPage />
        </StaticReading>
      </MemoryRouter>,
    );
    expect(document.querySelectorAll('a[href$="/browse/1/"]')).toHaveLength(
      categories.length,
    );
  });

  it('renders release notes and scrolls to a requested release', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    render(
      <MemoryRouter initialEntries={['/pl/changelog/#version-2-0-0']}>
        <ChangelogPage source={'## 2.0.0 - 2026-11-07\n- Add `map` links'} />
      </MemoryRouter>,
    );
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(document.querySelector('code')).toHaveTextContent('map');
    expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-11-07');
    scroll.mockRestore();
  });

  it.each(['/changelog/', '/changelog/#missing'])(
    'keeps the repository fallback when release notes are empty: %s',
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <ChangelogPage source="No releases" />
        </MemoryRouter>,
      );
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://github.com/PKrystian/Fumble/blob/main/CHANGELOG.md',
      );
      expect(document.querySelector('time')).toBeNull();
    },
  );

  it.each(['', '/pl'])(
    'renders complete public documents and footer in static HTML: %s',
    (prefix) => {
      for (const page of LEGAL_PAGES) {
        const html = renderPublicPage(`${prefix}${legalPath(page)}/`)!;
        const document = new DOMParser().parseFromString(html, 'text/html');
        const main = document.querySelector('main')!;
        expect(main.querySelector('h1')).not.toBeNull();
        expect(main.querySelector('time')?.getAttribute('datetime')).toBe(
          LEGAL_DATES[page],
        );
        expect(main.querySelector('footer')).toBeNull();
        expect(document.querySelector('footer')).not.toBeNull();
        expect(main.textContent).not.toContain('[[');
        expect(main.textContent!.length).toBeGreaterThan(600);
        if (page === 'connections') expect(main.querySelectorAll('dl')).toHaveLength(6);
        if (page === 'contact')
          expect(main.querySelectorAll('a').length).toBeGreaterThan(6);
      }
      const map = renderPublicPage(`${prefix}/site-map/`)!;
      expect(map.match(/\/browse\/1\//g)).toHaveLength(categories.length);
      expect(renderPublicPage(`${prefix}/changelog/`)).toContain('version-1-6-0');
      expect(renderPublicPage(`${prefix}/not-a-page/`)).toBeNull();
    },
  );
});
