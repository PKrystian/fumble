import { useMemo, type MouseEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Link, useNavigate } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useWiki } from './useWiki';
import type { WikiPage as WikiPageData } from './types';

export function WikiPage() {
  const { t } = useT();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { status, data } = useWiki();

  const pages = data?.pages ?? [];
  const selected =
    pages.find((page) => page.slug === slug) ??
    pages.find((page) => page.slug === 'home') ??
    pages[0];

  useSeo(selected ? selected.title : t('nav.wiki'));

  const html = useMemo(
    () => (selected ? selected.html.replaceAll('%BASE%', import.meta.env.BASE_URL) : ''),
    [selected],
  );

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a[data-wiki-link]');
    if (!anchor) return;
    event.preventDefault();
    const target = anchor.getAttribute('data-wiki-link');
    if (target) navigate(`/wiki/${target}`);
  };

  if (status === 'loading') {
    return <p className="p-6 text-ink-400">{t('wiki.loading')}</p>;
  }
  if (status === 'error' || pages.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-ink-300">
        <h1 className="mb-3 font-display text-2xl font-bold text-ink-50">
          {t('wiki.campaignWiki')}
        </h1>
        <p>
          {t('wiki.noContentYet')}{' '}
          <code className="rounded bg-ink-800 px-1">
            npm run wiki:build -- --input ＜vault＞
          </code>
          .
        </p>
      </div>
    );
  }

  const grouped = groupByCategory(pages);

  return (
    <div className="flex min-h-0 flex-1">
      <aside
        className={[
          'w-full shrink-0 overflow-y-auto border-r border-ink-700 md:w-72',
          slug ? 'hidden md:block' : 'block',
        ].join(' ')}
      >
        <h1 className="border-b border-ink-700 p-4 font-display text-xl font-bold text-ink-50">
          {t('nav.wiki')}
        </h1>
        {[...grouped.entries()].map(([category, categoryPages]) => (
          <div key={category} className="p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {category}
            </p>
            {categoryPages.map((page) => (
              <Link
                key={page.slug}
                to={`/wiki/${page.slug}`}
                className={[
                  'block rounded-md px-2 py-1.5 text-sm transition-colors',
                  page.slug === selected?.slug
                    ? 'bg-arcane-700/40 text-ink-50'
                    : 'text-ink-200 hover:bg-ink-800',
                ].join(' ')}
              >
                {page.title}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      <main
        className={[
          'min-w-0 flex-1 overflow-y-auto',
          slug ? 'block' : 'hidden md:block',
        ].join(' ')}
      >
        {selected && (
          <article className="mx-auto max-w-3xl px-6 py-8">
            <Link
              to="/wiki"
              className="mb-4 inline-block text-sm text-ink-300 hover:text-ink-50 md:hidden"
            >
              ← {t('wiki.allPages')}
            </Link>
            <h1 className="mb-4 font-display text-3xl font-bold text-ink-50">
              {selected.title}
            </h1>
            <div
              className="wiki-content"
              onClick={handleClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        )}
      </main>
    </div>
  );
}

function groupByCategory(pages: WikiPageData[]): Map<string, WikiPageData[]> {
  const grouped = new Map<string, WikiPageData[]>();
  for (const page of pages) {
    const list = grouped.get(page.category) ?? [];
    list.push(page);
    grouped.set(page.category, list);
  }
  return grouped;
}
