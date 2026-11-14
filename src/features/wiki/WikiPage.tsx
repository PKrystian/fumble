import { Button, IconButton } from '@/features/ui/primitives';
import { ArrowLeft, Map as MapIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Link } from '@/i18n/path';
import { useNavigate } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { NotFoundPage } from '@/features/NotFoundPage';
import { getCampaignMap } from '@/features/campaign-map/maps';
import { useLightbox } from '@/features/ui/lightboxStore';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { buttonClass } from '@/features/ui/styles';
import { sanitizeWikiHtml } from './html';
import { campaignTitle, mergeCampaigns, type WikiCampaignView } from './campaigns';
import { useWiki } from './useWiki';
import { WikiCatalog } from './WikiCatalog';
import { wikiPageCount } from './catalog';
import { wikiText } from './content';
import type { WikiPage as WikiPageData } from './types';
import { isWikiPageIndexable, WIKI_CONTENT_LOCALE } from './indexability';

export function WikiPage() {
  const { locale, t } = useT();
  const { campaignId, slug } = useParams<{ campaignId?: string; slug?: string }>();
  const [retryKey, setRetryKey] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const closeCatalog = () => setCatalogOpen(false);
  const dialogRef = useDialogFocus(catalogOpen, closeCatalog);
  const { status, data } = useWiki(retryKey);
  const campaigns = useMemo(() => mergeCampaigns(data?.campaigns ?? []), [data]);
  const sorted = [...campaigns].sort((a, b) =>
    campaignTitle(a, t).localeCompare(campaignTitle(b, t), locale),
  );
  const legacy =
    campaignId && !slug && !campaigns.some((campaign) => campaign.id === campaignId)
      ? campaigns
          .flatMap((campaign) => campaign.pages)
          .find((page) => page.slug === campaignId)
      : undefined;
  const campaign =
    campaigns.find((entry) => entry.id === (legacy?.campaignId ?? campaignId)) ??
    (!campaignId && campaigns.length === 1 ? campaigns[0] : undefined);
  const pages = campaign?.pages.filter(isWikiPageIndexable) ?? [];
  const requested =
    legacy ?? (slug ? campaign?.pages.find((page) => page.slug === slug) : undefined);
  const selected = requested
    ? isWikiPageIndexable(requested)
      ? requested
      : undefined
    : slug
      ? undefined
      : (pages.find((page) => page.slug === 'home') ?? pages[0]);
  const missing =
    status === 'ready' && ((campaignId && !campaign) || (slug && !requested));
  const hasMap = campaign && getCampaignMap(campaign.id);
  const indexable =
    locale === WIKI_CONTENT_LOCALE &&
    !missing &&
    (!requested || isWikiPageIndexable(requested)) &&
    (!campaignId || Boolean(pages.length || hasMap));
  const title =
    selected?.title ?? (campaign ? campaignTitle(campaign, t) : t('wiki.chooseCampaign'));
  const excerpt = selected
    ? [selected.category, wikiText(selected.html)].filter(Boolean).join('. ')
    : campaign
      ? t('wiki.campaignNoPages')
      : t('seo.pageDescriptions.wiki');
  useSeo(
    title,
    excerpt.length > 155 ? `${excerpt.slice(0, 152).trimEnd()}...` : excerpt,
    status === 'ready' && indexable,
    indexable ? [WIKI_CONTENT_LOCALE] : [],
  );

  if (status !== 'ready')
    return (
      <div className="page-shell page-shell-reading">
        <h1 className="page-title">{t('wiki.campaignWiki')}</h1>
        {status === 'loading' ? (
          <p role="status" className="notice mt-6">
            {t('wiki.loading')}
          </p>
        ) : (
          <>
            <p role="alert" className="notice notice-error mt-6">
              {t('wiki.loadError')}
            </p>
            <Button onClick={() => setRetryKey((value) => value + 1)} className="mt-4">
              {t('common.retry')}
            </Button>
          </>
        )}
      </div>
    );
  if (missing) return <NotFoundPage />;
  if (!campaign && sorted.length > 1)
    return (
      <div className="page-shell">
        <h1 className="page-title">{t('wiki.chooseCampaign')}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sorted.map((entry) => (
            <Link key={entry.id} to={`/wiki/${entry.id}`} className="catalog-card">
              <h2 className="section-title">{campaignTitle(entry, t)}</h2>
              <p className="mt-2 text-sm text-ink-300">
                {t(
                  wikiPageCount(entry.pages.filter(isWikiPageIndexable).length, locale),
                  { count: entry.pages.filter(isWikiPageIndexable).length },
                )}
              </p>
              {getCampaignMap(entry.id) && (
                <p className="mt-4 flex items-center gap-2 text-sm text-arcane-300">
                  <MapIcon size={18} aria-hidden="true" />
                  {t('wiki.chultMap')}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  if (!campaign)
    return (
      <div className="page-shell">
        <h1 className="page-title">{t('wiki.campaignWiki')}</h1>
        <p className="empty-state mt-6">{t('wiki.noCampaigns')}</p>
      </div>
    );
  const campaignName = campaignTitle(campaign, t);
  if (!selected) return <CampaignLanding campaign={campaign} />;
  return (
    <div className="flex min-w-0 items-start">
      {!catalogOpen && (
        <aside className="sticky top-0 hidden max-h-dvh w-72 shrink-0 overflow-y-auto border-r border-ink-700 p-4 xl:block">
          <h2 className="mb-4 section-title">{t('wiki.allPages')}</h2>
          <WikiCatalog key={campaign.id} campaign={campaign} selected={selected.slug} />
        </aside>
      )}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950 px-4 py-3 xl:hidden">
          <Button
            onClick={() => setCatalogOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={catalogOpen}
          >
            {t('wiki.allPages')}
          </Button>
        </div>
        <article className="page-shell page-shell-reading">
          <nav
            aria-label={t('wiki.breadcrumbs')}
            className="mb-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-arcane-300"
          >
            <Link to="/wiki" className="back-link mb-0">
              <ArrowLeft size={16} aria-hidden="true" />
              {t('wiki.backToCampaigns')}
            </Link>
            <Link
              to={`/wiki/${campaign.id}`}
              className="back-link mb-0"
              aria-current={!slug && !legacy ? 'page' : undefined}
            >
              {campaignName}
            </Link>
            {hasMap && (
              <Link to={`/wiki/${campaign.id}/map`} className="back-link mb-0">
                {t('wiki.chultMap')}
              </Link>
            )}
          </nav>
          <h1 className="page-title mb-4">{selected.title}</h1>
          {locale !== WIKI_CONTENT_LOCALE && (
            <p className="notice mb-6">{t('wiki.sourceLanguage')}</p>
          )}
          <WikiArticle key={`${campaign.id}/${selected.slug}`} page={selected} />
        </article>
      </div>
      {catalogOpen && (
        <div className="dialog-overlay" onClick={closeCatalog}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wiki-catalog-title"
            tabIndex={-1}
            className="dialog-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-4">
              <h2 id="wiki-catalog-title" className="section-title">
                {t('wiki.allPages')}
              </h2>
              <IconButton
                label={t('common.close')}
                variant="ghost"
                size="sm"
                onClick={closeCatalog}
              >
                <X size={18} aria-hidden="true" />
              </IconButton>
            </div>
            <div className="overflow-y-auto p-4">
              <WikiCatalog
                campaign={campaign}
                selected={selected.slug}
                onNavigate={closeCatalog}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WikiArticle({ page }: { page: WikiPageData }) {
  const { locale, t } = useT();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { params } = useUrlSearchState();
  const search = params.toString() ? `?${params}` : '';
  const openLightbox = useLightbox((state) => state.open);
  const { html, headings } = useMemo(() => {
    const html = sanitizeWikiHtml(
      page.html.replaceAll('%BASE%', import.meta.env.BASE_URL),
      t('common.imageViewer'),
      locale,
      search,
    );
    const root = document.createElement('div');
    root.innerHTML = html;
    const headings = [
      ...root.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]'),
    ].map((heading) => ({
      id: heading.id,
      title: heading.textContent,
      level: heading.tagName,
    }));
    return { html, headings };
  }, [page.html, locale, search, t]);
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    }
  }, [hash, html]);
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor?.target === '_blank' || anchor?.hasAttribute('download')) return;
    const image =
      target.closest('img') ??
      target.closest('[data-image-viewer]')?.querySelector('img');
    if (image) {
      event.preventDefault();
      openLightbox(image.currentSrc || image.src, image.alt);
      return;
    }
    const link = target.closest('a[data-wiki-link]');
    const destination = link?.getAttribute('data-wiki-link');
    if (destination) {
      event.preventDefault();
      navigate(`/wiki/${destination}${search}`);
    }
  };
  return (
    <>
      {headings.length >= 3 && (
        <details className="wiki-contents mb-6 rounded-xl border border-ink-700 p-4">
          <summary className="cursor-pointer font-semibold text-ink-200">
            {t('wiki.contents')}
          </summary>
          <nav aria-label={t('wiki.contents')} className="mt-3 max-h-64 overflow-y-auto">
            <ul className="space-y-2">
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level === 'H2' ? '' : 'pl-4'}>
                  <a href={`#${heading.id}`} className="back-link mb-0 underline">
                    {heading.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      )}
      <div
        className="wiki-content reading-content"
        lang={WIKI_CONTENT_LOCALE}
        onClick={handleClick}
        onErrorCapture={(event) => {
          if (!(event.target instanceof HTMLImageElement)) return;
          const image = event.target;
          const card = image.closest('.wiki-infobox, .wiki-box');
          (image.closest('[data-image-viewer]') ?? image).remove();
          if (card && !card.querySelector('table, .wiki-infobox-summary, img'))
            card.remove();
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}

function CampaignLanding({ campaign }: { campaign: WikiCampaignView }) {
  const { t } = useT();
  return (
    <div className="page-shell page-shell-reading">
      <Link to="/wiki" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('wiki.backToCampaigns')}
      </Link>
      <h1 className="page-title">{campaignTitle(campaign, t)}</h1>
      <p className="empty-state mt-6">{t('wiki.campaignNoPages')}</p>
      {getCampaignMap(campaign.id) && (
        <Link
          to={`/wiki/${campaign.id}/map`}
          className={buttonClass({ variant: 'primary', className: 'mt-6' })}
        >
          <MapIcon size={18} aria-hidden="true" />
          {t('wiki.chultMap')}
        </Link>
      )}
    </div>
  );
}
