import { Button } from '@/features/ui/primitives';
import { ArrowLeft, ChevronRight, Map as MapIcon } from 'lucide-react';
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from '@/i18n/path';
import { useNavigate } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { NotFoundPage } from '@/features/NotFoundPage';
import { getCampaignMap } from '@/features/campaign-map/maps';
import { useLightbox } from '@/features/ui/lightboxStore';
import { sanitizeWikiHtml } from './html';
import { campaignTitle, mergeCampaigns, type WikiCampaignView } from './campaigns';
import { useWiki } from './useWiki';
import type { WikiPage as WikiPageData } from './types';
import { isWikiPageIndexable, WIKI_CONTENT_LOCALE } from './indexability';

const WIKI_ALTERNATE_LOCALES = [WIKI_CONTENT_LOCALE] as const;

function seoExcerpt(page: WikiPageData): string {
  const text = page.html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const value = [page.category, text].filter(Boolean).join('. ');
  return value.length <= 155 ? value : `${value.slice(0, 152).trimEnd()}...`;
}

export function WikiPage() {
  const { locale, t } = useT();
  const { campaignId: routeCampaignId, slug } = useParams<{
    campaignId?: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const [retryKey, setRetryKey] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const openLightbox = useLightbox((state) => state.open);
  const { status, data } = useWiki(retryKey);
  const campaigns = useMemo(() => mergeCampaigns(data?.campaigns ?? []), [data]);
  const sortedCampaigns = useMemo(
    () =>
      [...campaigns].sort((a, b) =>
        campaignTitle(a, t).localeCompare(campaignTitle(b, t)),
      ),
    [campaigns, t],
  );
  const legacyPage = useMemo(() => {
    if (
      !routeCampaignId ||
      slug ||
      campaigns.some((campaign) => campaign.id === routeCampaignId)
    ) {
      return null;
    }
    return (
      campaigns
        .flatMap((campaign) => campaign.pages)
        .find((page) => page.slug === routeCampaignId) ?? null
    );
  }, [campaigns, routeCampaignId, slug]);
  const selectedCampaign = useMemo(() => {
    if (legacyPage) {
      return campaigns.find((campaign) => campaign.id === legacyPage.campaignId);
    }
    if (routeCampaignId) {
      return campaigns.find((campaign) => campaign.id === routeCampaignId);
    }
    return campaigns.length === 1 ? campaigns[0] : undefined;
  }, [campaigns, legacyPage, routeCampaignId]);
  const selected = useMemo(() => {
    if (!selectedCampaign) return undefined;
    if (legacyPage) return legacyPage;
    if (!slug) {
      return (
        selectedCampaign.pages.find((page) => page.slug === 'home') ??
        selectedCampaign.pages[0]
      );
    }
    return selectedCampaign.pages.find((page) => page.slug === slug);
  }, [legacyPage, selectedCampaign, slug]);

  const routeNotFound =
    status === 'ready' &&
    ((Boolean(routeCampaignId) && !selectedCampaign && !legacyPage) ||
      Boolean(selectedCampaign && slug && !selected));
  const hasWikiContent = !routeCampaignId
    ? true
    : selected
      ? isWikiPageIndexable(selected)
      : Boolean(selectedCampaign?.pages.some(isWikiPageIndexable));
  const wikiSeoIndexable = locale === WIKI_CONTENT_LOCALE && hasWikiContent;

  useSeo(
    selected
      ? selected.title
      : selectedCampaign
        ? campaignTitle(selectedCampaign, t)
        : t('seo.pageTitles.wiki'),
    selected
      ? seoExcerpt(selected) || t('seo.pageDescriptions.wiki')
      : selectedCampaign
        ? t('wiki.campaignNoPages')
        : t('seo.pageDescriptions.wiki'),
    status === 'ready' &&
      !routeNotFound &&
      Boolean(selectedCampaign || selected) &&
      wikiSeoIndexable,
    wikiSeoIndexable ? WIKI_ALTERNATE_LOCALES : [],
  );

  const html = useMemo(() => {
    if (!selected) return '';
    const sanitized = sanitizeWikiHtml(
      selected.html.replaceAll('%BASE%', import.meta.env.BASE_URL),
      t('common.imageViewer'),
    );
    return sanitized
      .replace(
        /(<div class="wiki-locked"[^>]*>)[^<]*(<\/div>)/g,
        `$1${t('wiki.notYetUnlocked')}$2`,
      )
      .replace(/<p>Nothing here<\/p>/gi, `<p>${t('wiki.emptyPage')}</p>`);
  }, [selected, t]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const eventTarget = event.target as HTMLElement;
    const image =
      eventTarget.closest('img') ??
      eventTarget.closest('[data-image-viewer]')?.querySelector('img');
    if (image) {
      event.preventDefault();
      openLightbox(image.currentSrc || image.src, image.alt);
      return;
    }

    const anchor = eventTarget.closest('a[data-wiki-link]');
    if (!anchor) return;
    event.preventDefault();
    const target = anchor.getAttribute('data-wiki-link');
    if (target) navigate(`/wiki/${target}`);
  };

  if (status === 'loading') {
    return <p className="p-6 text-ink-400">{t('wiki.loading')}</p>;
  }
  if (status === 'error') {
    return (
      <div className="text-center text-ink-300 page-shell">
        <h1 className="mb-3 text-ink-50 page-title">{t('wiki.campaignWiki')}</h1>
        <p>
          {t('wiki.noContentYet')}{' '}
          <code className="rounded bg-ink-800 px-1">
            npm run wiki:build -- --input &lt;vault&gt;
          </code>
          .
        </p>
        <Button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
          variant="secondary"
          className="mt-6"
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }
  if (routeNotFound) return <NotFoundPage />;
  if (!selectedCampaign && sortedCampaigns.length > 1) {
    return <CampaignChooser campaigns={sortedCampaigns} />;
  }
  if (!selectedCampaign) {
    return (
      <div className="text-center text-ink-300 page-shell">
        <h1 className="mb-3 text-ink-50 page-title">{t('wiki.campaignWiki')}</h1>
        <p>{t('wiki.noCampaigns')}</p>
      </div>
    );
  }
  if (!selected) {
    return <CampaignLanding campaign={selectedCampaign} />;
  }

  const grouped = groupByCategory(selectedCampaign.pages);
  const selectedCampaignTitle = campaignTitle(selectedCampaign, t);
  const map = getCampaignMap(selectedCampaign.id);
  const explicitPage = Boolean(slug || legacyPage);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <aside
          className={[
            'w-full shrink-0 overflow-y-auto border-r border-ink-700 bg-ink-950/40 md:w-80',
            explicitPage ? 'hidden md:block' : 'block',
          ].join(' ')}
        >
          <nav
            aria-label={t('wiki.breadcrumbs')}
            className="border-b border-ink-800 px-4 py-3"
          >
            <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
              <li>
                <Link
                  to="/wiki"
                  className="text-ink-400 transition-colors hover:text-ink-100"
                >
                  {t('nav.wiki')}
                </Link>
              </li>
              <li aria-hidden="true" className="text-ink-500">
                <ChevronRight size={13} />
              </li>
              <li className="min-w-0">
                <Link
                  to={`/wiki/${selectedCampaign.id}`}
                  className="block truncate font-medium text-ink-200 transition-colors hover:text-ink-50"
                >
                  {selectedCampaignTitle}
                </Link>
              </li>
              {explicitPage && (
                <>
                  <li aria-hidden="true" className="text-ink-500">
                    <ChevronRight size={13} />
                  </li>
                  <li aria-current="page" className="min-w-0 truncate text-ink-500">
                    {selected.title}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <div className="p-3">
            {map && (
              <Link
                to={`/wiki/${selectedCampaign.id}/map`}
                className="group flex items-center gap-3 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-3 text-sm text-ink-50 transition-colors hover:border-ember-400 hover:bg-ember-500/20"
              >
                <MapIcon size={19} aria-hidden="true" className="text-ember-400" />
                <span className="min-w-0">
                  <span className="block font-semibold">{t('wiki.chultMap')}</span>
                  <span className="mt-0.5 block text-xs text-ink-300">
                    {t('wiki.chultMapSidebarDescription')}
                  </span>
                </span>
              </Link>
            )}
          </div>
          {[...grouped.entries()].map(([category, categoryPages]) => (
            <div key={category} className="px-3 pb-2 pt-2">
              <div className="flex items-center justify-between px-2">
                <h2 className="tracking-[0.12em] text-ember-400 panel-title">
                  {category}
                </h2>
                <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-400">
                  {categoryPages.length}
                </span>
              </div>
              <div className="ml-2 mt-1 border-l border-ink-700 pl-2">
                {categoryPages.map((page) => (
                  <Link
                    key={page.slug}
                    to={`/wiki/${selectedCampaign.id}/${page.slug}`}
                    className={[
                      'block rounded-md px-3 py-2 text-sm transition-colors',
                      page.slug === selected.slug
                        ? 'bg-arcane-700 font-medium text-white'
                        : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50',
                    ].join(' ')}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section
          className={[
            'min-w-0 flex-1 overflow-y-auto',
            explicitPage ? 'block' : 'hidden md:block',
          ].join(' ')}
        >
          <article ref={articleRef} className="page-shell page-shell-reading">
            {explicitPage && (
              <Link to={`/wiki/${selectedCampaign.id}`} className="back-link md:hidden">
                <ArrowLeft size={16} aria-hidden="true" />
                {t('wiki.allPages')}
              </Link>
            )}
            <h1 className="mb-4 text-ink-50 page-title">{selected.title}</h1>
            <div
              className="wiki-content reading-content"
              onClick={handleClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        </section>
      </div>
    </div>
  );
}

function CampaignChooser({ campaigns }: { campaigns: WikiCampaignView[] }) {
  const { locale, t } = useT();
  const indexable = locale === WIKI_CONTENT_LOCALE;
  useSeo(
    t('wiki.chooseCampaign'),
    t('seo.pageDescriptions.wiki'),
    indexable,
    indexable ? WIKI_ALTERNATE_LOCALES : [],
  );

  return (
    <div className="page-shell">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ember-400">
        {t('nav.wiki')}
      </p>
      <h1 className="mt-2 text-ink-50 page-title">{t('wiki.chooseCampaign')}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {campaigns.map((campaign) => {
          const map = getCampaignMap(campaign.id);
          return (
            <Link
              key={campaign.id}
              to={`/wiki/${campaign.id}`}
              className="catalog-card group"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-ink-50 group-hover:text-arcane-300 section-title">
                    {campaignTitle(campaign, t)}
                  </h2>
                  <p className="mt-2 text-sm text-ink-300">
                    {t('wiki.pageCount', { count: campaign.pages.length })}
                  </p>
                </div>
                {map && (
                  <MapIcon size={22} aria-hidden="true" className="text-ember-400" />
                )}
              </div>
              {map && (
                <p className="mt-5 border-t border-ink-700 pt-3 text-sm text-ember-400">
                  {t('wiki.chultMap')}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CampaignLanding({ campaign }: { campaign: WikiCampaignView }) {
  const { t } = useT();
  const map = getCampaignMap(campaign.id);
  const title = campaignTitle(campaign, t);

  return (
    <div className="page-shell">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ember-400">
        {t('nav.wiki')}
      </p>
      <h1 className="mt-2 text-ink-50 page-title">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
        {t('wiki.campaignNoPages')}
      </p>
      {map && (
        <Link
          to={`/wiki/${campaign.id}/map`}
          className="mt-8 inline-flex items-center gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 px-4 py-3 text-sm font-medium text-ink-50 hover:border-ember-400 hover:bg-ember-500/20"
        >
          <MapIcon size={19} aria-hidden="true" className="text-ember-400" />
          {t('wiki.chultMap')}
        </Link>
      )}
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
